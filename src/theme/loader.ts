import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { access, copyFile, cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { z } from 'zod'
import type { LoadedConfig } from '../core/config.ts'
import type { PageItem, PageKind, Post } from '../core/types.ts'
import { BuildError } from '../shared/errors.ts'
import type { Logger } from '../shared/logger.ts'
import { withBase } from '../shared/url.ts'
import { isTheme, type LayoutFn, type Theme } from './api.ts'
import { loadTranslations, type Translations } from './i18n.ts'

const manifestSchema = z
  .object({
    name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    version: z.string().min(1),
    apiVersion: z.literal(1),
    entry: z.string().min(1),
    assets: z.string().default('./assets'),
    i18n: z.string().default('./i18n'),
    preview: z.string().optional(),
  })
  .strict()

export type ThemeManifest = z.output<typeof manifestSchema>

export interface LoadedTheme {
  dir: string
  manifest: ThemeManifest
  theme: Theme
  config: unknown
  translations: Translations
}

const require = createRequire(import.meta.url)

function packageRoot(): string {
  return path.dirname(require.resolve('dxbe/package.json'))
}

function runningFromDist(): boolean {
  return fileURLToPath(import.meta.url).includes(`${path.sep}dist${path.sep}`)
}

function builtInThemesRoot(): string {
  return runningFromDist()
    ? path.join(packageRoot(), 'dist', 'themes')
    : path.join(packageRoot(), 'themes')
}

export async function listThemeNames(root: string): Promise<string[]> {
  const names = new Set<string>()

  const add = async (dir: string): Promise<void> => {
    if (!(await pathExists(dir))) return
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) names.add(entry.name)
    }
  }

  await add(builtInThemesRoot())
  await add(path.join(root, 'themes'))
  return [...names].sort()
}

export async function resolveThemeDir(root: string, name: string): Promise<string | undefined> {
  const siteTheme = path.join(root, 'themes', name)
  if (await pathExists(siteTheme)) return siteTheme
  const builtInTheme = path.join(builtInThemesRoot(), name)
  if (await pathExists(builtInTheme)) return builtInTheme
  return undefined
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

async function walkFiles(dir: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(path.join(dir, prefix), { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(dir, relative)))
    } else if (entry.isFile()) {
      files.push(relative)
    }
  }
  return files.sort()
}

function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 10)
}

export async function loadTheme(loaded: LoadedConfig, logger: Logger): Promise<LoadedTheme> {
  const themeDir = await resolveThemeDir(loaded.root, loaded.config.theme.name)
  if (!themeDir) {
    throw new BuildError(`Theme "${loaded.config.theme.name}" was not found`, {
      code: 'THEME',
      hint: 'it is neither in themes/ nor in the dxbe built-in themes',
    })
  }
  const manifestFile = path.join(themeDir, 'theme.json')
  let manifestSource: string
  try {
    manifestSource = await readFile(manifestFile, 'utf8')
  } catch {
    throw new BuildError(`Theme "${loaded.config.theme.name}" not found`, {
      code: 'THEME',
      file: path.relative(loaded.root, themeDir),
      hint: 'expected themes/<name>/theme.json',
    })
  }

  let manifestJson: unknown
  try {
    manifestJson = JSON.parse(manifestSource)
  } catch (error) {
    throw new BuildError('theme.json is not valid JSON', {
      code: 'THEME',
      file: path.relative(loaded.root, manifestFile),
      cause: error,
    })
  }

  const checked = manifestSchema.safeParse(manifestJson)
  if (!checked.success) {
    throw new BuildError(
      `theme.json is invalid: ${checked.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')}`,
      { code: 'THEME', file: path.relative(loaded.root, manifestFile) },
    )
  }
  const manifest = checked.data

  const entryFile = path.resolve(themeDir, manifest.entry)
  const relativeEntry = path.relative(themeDir, entryFile)
  if (relativeEntry.startsWith('..') || path.isAbsolute(relativeEntry)) {
    throw new BuildError('theme entry escapes the theme directory', {
      code: 'THEME',
      file: path.relative(loaded.root, manifestFile),
    })
  }

  let imported: { default?: unknown }
  try {
    imported = (await import(pathToFileURL(entryFile).href)) as { default?: unknown }
  } catch (error) {
    throw new BuildError(`Failed to import theme entry ${manifest.entry}`, {
      code: 'THEME',
      file: path.relative(loaded.root, entryFile),
      cause: error,
    })
  }

  if (!isTheme(imported.default)) {
    throw new BuildError('Theme entry must default-export defineTheme({ ... })', {
      code: 'THEME',
      file: path.relative(loaded.root, entryFile),
    })
  }
  const theme = imported.default

  let themeConfig: unknown = loaded.config.theme.config
  if (theme.config) {
    try {
      themeConfig = theme.config.parse(loaded.config.theme.config)
    } catch (error) {
      throw new BuildError(`Invalid config for theme "${manifest.name}"`, {
        code: 'THEME',
        file: path.relative(loaded.root, manifestFile),
        hint: error instanceof Error ? error.message : String(error),
        cause: error,
      })
    }
  }

  const translations = await loadTranslations(
    themeDir,
    manifest.i18n,
    loaded.root,
    Object.keys(loaded.config.locales.entries),
    logger,
  )

  return { dir: themeDir, manifest, theme, config: themeConfig, translations }
}

export async function copyThemeAssets(
  loaded: LoadedTheme,
  themeName: string,
  outDir: string,
  base: string,
  logger: Logger,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const assetsRoot = path.resolve(loaded.dir, loaded.manifest.assets)
  if (!(await pathExists(assetsRoot))) {
    logger.warn(`theme ${themeName} has no assets directory at ${loaded.manifest.assets}`)
    return map
  }

  const files = await walkFiles(assetsRoot)
  for (const relative of files) {
    const source = path.join(assetsRoot, relative)
    const buffer = await readFile(source)
    const destination = path.join(outDir, 'assets', themeName, relative)
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, buffer)
    const url = `${withBase(base, `/assets/${themeName}/${relative}`)}?v=${hashBuffer(buffer)}`
    map.set(relative, url)
  }
  return map
}

/** A file from src/assets, which ships as dist/src/assets in the package. */
function engineAsset(name: string): string {
  const source = path.join(packageRoot(), 'src', 'assets', name)
  const packaged = path.join(packageRoot(), 'dist', 'src', 'assets', name)
  const candidates = runningFromDist() ? [packaged, source] : [source, packaged]
  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found) {
    throw new BuildError(`${name} was not found in the dxbe package`, {
      code: 'THEME',
    })
  }
  return found
}

export async function copySearchAsset(
  _root: string,
  outDir: string,
  base: string,
): Promise<string> {
  const source = engineAsset('search.js')
  const buffer = await readFile(source)
  const destination = path.join(outDir, 'assets', 'search.js')
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, buffer)
  return `${withBase(base, '/assets/search.js')}?v=${hashBuffer(buffer)}`
}

export async function copyKatexAssets(outDir: string, base: string): Promise<string> {
  let cssPath: string
  try {
    cssPath = require.resolve('katex/dist/katex.min.css')
  } catch (error) {
    throw new BuildError('KaTeX CSS not found; run npm install', {
      code: 'THEME',
      cause: error,
    })
  }
  const sourceDir = path.dirname(cssPath)
  const destinationDir = path.join(outDir, 'assets', 'vendor', 'katex')
  await mkdir(destinationDir, { recursive: true })
  await copyFile(cssPath, path.join(destinationDir, 'katex.min.css'))
  const fontsDir = path.join(sourceDir, 'fonts')
  if (await pathExists(fontsDir)) {
    await cp(fontsDir, path.join(destinationDir, 'fonts'), { recursive: true })
  }
  const css = await readFile(cssPath)
  return `${withBase(base, '/assets/vendor/katex/katex.min.css')}?v=${hashBuffer(css)}`
}

export async function copyPublicAssets(
  root: string,
  outDir: string,
  logger: Logger,
): Promise<void> {
  const publicDir = path.join(root, 'public')
  if (await pathExists(publicDir)) {
    await cp(publicDir, outDir, { recursive: true })
  } else {
    logger.debug('no public/ directory')
  }
  // every theme links /favicon.svg; a new blog should not ship a broken link
  const favicon = path.join(outDir, 'favicon.svg')
  if (!(await pathExists(favicon))) {
    await copyFile(engineAsset('favicon.svg'), favicon)
    logger.debug('using the default favicon.svg')
  }
  const nojekyll = path.join(outDir, '.nojekyll')
  if (!(await pathExists(nojekyll))) {
    await writeFile(nojekyll, '', 'utf8')
  }
}

export async function writeCname(outDir: string, customDomain?: string): Promise<void> {
  if (!customDomain) return
  await writeFile(path.join(outDir, 'CNAME'), `${customDomain.trim()}\n`, 'utf8')
}

function taskItem(task: { post?: Post; pageItem?: PageItem }): Post | PageItem | undefined {
  return task.post ?? task.pageItem
}

export async function copyTaskAssets(
  task: { post?: Post; pageItem?: PageItem; outFile: string },
  outDir: string,
): Promise<void> {
  const item = taskItem(task)
  if (!item || item.assetFiles.length === 0) return
  const destinationDir = path.dirname(path.join(outDir, task.outFile))
  const sourceDir = path.resolve(item.sourceDir)
  for (const relative of item.assetFiles) {
    const source = path.resolve(sourceDir, relative)
    if (source !== sourceDir && !source.startsWith(`${sourceDir}${path.sep}`)) {
      throw new BuildError(`Asset path escapes post directory: ${relative}`, {
        code: 'OUTPUT',
        file: item.sourceFile,
      })
    }
    const destination = path.join(destinationDir, relative)
    await mkdir(path.dirname(destination), { recursive: true })
    await copyFile(source, destination)
  }
}

const FALLBACKS: Record<PageKind, PageKind[]> = {
  index: ['index'],
  home: ['home', 'page', 'index'],
  post: ['post', 'page', 'index'],
  page: ['page', 'post', 'index'],
  publications: ['publications', 'page', 'post', 'index'],
  archive: ['archive', 'index'],
  tag: ['tag', 'archive', 'index'],
  tags: ['tags', 'archive', 'index'],
  category: ['category', 'tag', 'archive', 'index'],
  categories: ['categories', 'tags', 'archive', 'index'],
  search: ['search', 'index'],
  notFound: ['notFound', 'page', 'index'],
}

export function resolveLayout(
  theme: Theme,
  kind: PageKind,
): { layout: LayoutFn; name: string; fallback: boolean } | undefined {
  const candidates = FALLBACKS[kind]
  for (const candidate of candidates) {
    const layout = theme.layouts[candidate]
    if (layout) {
      return { layout, name: candidate, fallback: candidate !== kind }
    }
  }
  return undefined
}
