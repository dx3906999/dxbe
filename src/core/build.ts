import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import type { Logger } from '../shared/logger.ts'
import { withBase } from '../shared/url.ts'
import {
  copyKatexAssets,
  copyPublicAssets,
  copySearchAsset,
  copyThemeAssets,
  copyUnlockAsset,
  loadTheme,
  writeCname,
} from '../theme/loader.ts'
import type { LoadedConfig } from './config.ts'
import { scanContent } from './content.ts'
import { atomFile, renderAtom, renderManifest, renderRobots, renderSitemap } from './outputs.ts'
import { type RenderDeps, renderTask } from './render.ts'
import { buildTasks, type RenderTask } from './routes.ts'
import type { ContentSet } from './types.ts'

export interface BuildOptions {
  outDir?: string
  atomic?: boolean
  includeDrafts?: boolean
  includeFuture?: boolean
  logger: Logger
}

export interface BuildResult {
  outDir: string
  tasks: RenderTask[]
  posts: number
  pages: number
  warnings: string[]
  durationMs: number
}

function countContent(content: ContentSet): { posts: number; pages: number } {
  let posts = 0
  let pages = 0
  for (const list of Object.values(content.postsByLang)) posts += list.length
  for (const list of Object.values(content.pagesByLang)) pages += list.length
  return { posts, pages }
}

export async function buildSite(loaded: LoadedConfig, options: BuildOptions): Promise<BuildResult> {
  const start = performance.now()
  const logger = options.logger
  const atomic = options.atomic ?? true
  const outDir = path.resolve(loaded.root, options.outDir ?? 'dist')
  const workDir = atomic ? path.join(loaded.root, '.build-tmp') : outDir

  if (atomic) await rm(workDir, { recursive: true, force: true })
  await mkdir(workDir, { recursive: true })

  const content = await scanContent(loaded, {
    includeDrafts: options.includeDrafts ?? false,
    includeFuture: options.includeFuture ?? false,
  })
  for (const warning of content.warnings) logger.warn(warning)

  const theme = await loadTheme(loaded, logger)
  const tasks = buildTasks(loaded, content)
  logger.debug(`theme ${theme.manifest.name}, ${tasks.length} routes`)

  const assetMap = await copyThemeAssets(
    theme,
    loaded.config.theme.name,
    workDir,
    loaded.base,
    logger,
  )
  await copyPublicAssets(loaded.root, workDir, logger)

  const hasMath =
    Object.values(content.postsByLang)
      .flat()
      .some((post) => post.hasMath) ||
    Object.values(content.pagesByLang)
      .flat()
      .some((page) => page.hasMath)
  const katexCss = hasMath ? await copyKatexAssets(workDir, loaded.base) : undefined
  if (
    Object.values(content.postsByLang)
      .flat()
      .some((post) => post.encrypted)
  ) {
    await copyUnlockAsset(workDir)
  }
  const searchJs = loaded.config.features.search
    ? await copySearchAsset(loaded.root, workDir, loaded.base)
    : undefined
  const searchIndex = loaded.config.features.search
    ? withBase(loaded.base, '/pagefind/pagefind.js')
    : undefined

  const deps: RenderDeps = {
    loaded,
    content,
    theme,
    assetMap,
    assets: {
      themeCss: assetMap.get('css/site.css'),
      themeJs: assetMap.get('js/site.js'),
      katexCss,
      searchJs,
      searchIndex,
    },
    translators: new Map(),
    logger,
  }

  for (const task of tasks) {
    await renderTask(task, deps, workDir)
  }

  const defaultLang = loaded.config.locales.default
  for (const [lang, posts] of Object.entries(content.postsByLang)) {
    const file = path.join(workDir, atomFile(lang, defaultLang))
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, renderAtom(loaded, lang, posts), 'utf8')
  }

  await writeFile(path.join(workDir, 'sitemap.xml'), renderSitemap(loaded, tasks), 'utf8')
  await writeFile(path.join(workDir, 'robots.txt'), renderRobots(loaded), 'utf8')
  await writeFile(
    path.join(workDir, 'build-manifest.json'),
    renderManifest(loaded, tasks, countContent(content)),
    'utf8',
  )
  await writeCname(workDir, loaded.config.site.customDomain)

  if (atomic) {
    await rm(outDir, { recursive: true, force: true })
    await rename(workDir, outDir)
  }

  const counts = countContent(content)
  return {
    outDir,
    tasks,
    posts: counts.posts,
    pages: counts.pages,
    warnings: content.warnings,
    durationMs: Math.round(performance.now() - start),
  }
}
