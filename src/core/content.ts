import type { Dirent } from 'node:fs'
import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import { parseDate, yearOf } from '../shared/date.ts'
import { BuildError } from '../shared/errors.ts'
import { raw } from '../shared/html.ts'
import { categoryPath, pagePath, postPath, tagPath } from '../shared/url.ts'
import type { LoadedConfig } from './config.ts'
import { createMarkdownRenderer } from './markdown.ts'
import type {
  Alternate,
  ArchiveGroup,
  CategoryView,
  ContentSet,
  PageItem,
  Post,
  Publication,
  TagView,
} from './types.ts'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const TRANSLATION_KEY_PATTERN = /^[a-zA-Z0-9._-]+$/
const MARKDOWN_EXTENSION = /\.md$/i

const frontmatterSchema = z
  .object({
    title: z.string().min(1),
    date: z.string().min(1),
    updated: z.string().optional(),
    tags: z.array(z.string().min(1)).default([]),
    categories: z.array(z.string().min(1)).default([]),
    slug: z.string().optional(),
    translationKey: z.string().optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  })
  .strict()

const publicationSchema = z
  .object({
    title: z.string().min(1),
    authors: z.union([z.string().min(1), z.array(z.string().min(1))]).default([]),
    venue: z.string().optional(),
    year: z.union([z.string(), z.number()]).optional(),
    type: z.string().optional(),
    note: z.string().optional(),
    links: z
      .array(z.object({ label: z.string().min(1), url: z.string().min(1) }).strict())
      .default([]),
  })
  .strict()

const pageFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    publications: z.array(publicationSchema).optional(),
    date: z.string().optional(),
    updated: z.string().optional(),
    slug: z.string().optional(),
    translationKey: z.string().optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  })
  .strict()

type Frontmatter = z.output<typeof frontmatterSchema>
type PageFrontmatter = z.output<typeof pageFrontmatterSchema>
type AnyFrontmatter = Frontmatter | PageFrontmatter

export interface ScanOptions {
  includeDrafts: boolean
  includeFuture: boolean
}

interface MarkdownEntry {
  file: string
  assetDir?: string
  name: string
}

interface ParsedSource {
  data: unknown
  body: string
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.length ? issue.path.join('.') : '(root)'}: ${issue.message}`)
    .join('; ')
}

function splitFrontmatter(source: string, file: string): ParsedSource {
  const normalized = source.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n')
  if (!normalized.startsWith('---\n')) {
    throw new BuildError('Missing YAML frontmatter', {
      code: 'CONTENT',
      file,
      hint: 'the file must start with --- followed by YAML',
    })
  }
  const closing = normalized.indexOf('\n---', 4)
  if (closing === -1) {
    throw new BuildError('Unterminated YAML frontmatter', {
      code: 'CONTENT',
      file,
      hint: 'close the block with a line containing ---',
    })
  }
  const yamlText = normalized.slice(4, closing)
  const after = normalized.slice(closing + 4)
  const body = after.startsWith('\n') ? after.slice(1) : after

  let data: unknown
  try {
    data = parseYaml(yamlText) ?? {}
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new BuildError(`Invalid YAML frontmatter: ${message}`, {
      code: 'CONTENT',
      file,
      cause: error,
    })
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new BuildError('Frontmatter must be a YAML mapping', { code: 'CONTENT', file })
  }
  return { data, body }
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

async function listMarkdownEntries(dir: string): Promise<MarkdownEntry[]> {
  let entries: Dirent[]
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }

  const result: MarkdownEntry[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const indexFile = path.join(full, 'index.md')
      if (await exists(indexFile)) {
        result.push({ file: indexFile, assetDir: full, name: entry.name })
      }
      continue
    }
    if (entry.isFile() && MARKDOWN_EXTENSION.test(entry.name)) {
      result.push({ file: full, name: entry.name.replace(MARKDOWN_EXTENSION, '') })
    }
  }
  return result.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

async function listAssets(dir: string): Promise<string[]> {
  const result: string[] = []

  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      const relative = path.relative(dir, full).split(path.sep).join('/')
      if (entry.isDirectory()) {
        await walk(full)
      } else if (entry.isFile() && relative.toLowerCase() !== 'index.md') {
        result.push(relative)
      }
    }
  }

  try {
    await walk(dir)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  return result.sort()
}

function validateSlug(slug: string, file: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new BuildError(`Invalid slug "${slug}"`, {
      code: 'CONTENT',
      file,
      hint: 'use lowercase ASCII letters, digits, and single hyphens',
    })
  }
}

function validateTranslationKey(key: string, file: string): void {
  if (!TRANSLATION_KEY_PATTERN.test(key)) {
    throw new BuildError(`Invalid translationKey "${key}"`, {
      code: 'CONTENT',
      file,
      hint: 'use letters, digits, dots, underscores, or hyphens',
    })
  }
}

function tagSlug(name: string): string {
  const normalized = name.normalize('NFC').trim().toLowerCase()
  const slug = normalized
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'tag'
}

function resolveSlug(frontmatter: AnyFrontmatter, fallback: string, file: string): string {
  const slug = frontmatter.slug ?? fallback
  validateSlug(slug, file)
  return slug
}

function resolveTranslationKey(frontmatter: AnyFrontmatter, slug: string, file: string): string {
  const key = frontmatter.translationKey ?? slug
  validateTranslationKey(key, file)
  return key
}

function checkDuplicate<T extends { slug: string; translationKey: string; sourceFile: string }>(
  items: T[],
  lang: string,
  kind: string,
): void {
  const slugs = new Map<string, string>()
  const keys = new Map<string, string>()
  for (const item of items) {
    const slugOwner = slugs.get(item.slug)
    if (slugOwner) {
      throw new BuildError(`Duplicate ${kind} slug "${item.slug}" in ${lang}`, {
        code: 'CONTENT',
        file: item.sourceFile,
        hint: `already used by ${slugOwner}`,
      })
    }
    slugs.set(item.slug, item.sourceFile)
    const keyOwner = keys.get(item.translationKey)
    if (keyOwner) {
      throw new BuildError(`Duplicate translationKey "${item.translationKey}" in ${lang}`, {
        code: 'CONTENT',
        file: item.sourceFile,
        hint: `already used by ${keyOwner}`,
      })
    }
    keys.set(item.translationKey, item.sourceFile)
  }
}

async function buildPost(
  loaded: LoadedConfig,
  lang: string,
  entry: MarkdownEntry,
  options: ScanOptions,
  render: (
    source: string,
    file: string,
  ) => Promise<{
    html: string
    toc: Post['toc']
    hasMath: boolean
    excerpt: string
    readingMinutes: number
  }>,
): Promise<Post | undefined> {
  const relativeFile = path.relative(loaded.root, entry.file).split(path.sep).join('/')
  const source = await readFile(entry.file, 'utf8')
  const parsed = splitFrontmatter(source, relativeFile)
  const checked = frontmatterSchema.safeParse(parsed.data)
  if (!checked.success) {
    throw new BuildError(`Invalid frontmatter: ${formatIssues(checked.error)}`, {
      code: 'CONTENT',
      file: relativeFile,
    })
  }

  const frontmatter = checked.data
  const slug = resolveSlug(frontmatter, entry.name, relativeFile)
  // a post slug "page" would collide with /posts/page/<n>/ once the list lives at /posts/
  if (slug === 'page' && loaded.config.home.layout === 'profile') {
    throw new BuildError('Post slug "page" is reserved when home.layout is "profile"', {
      code: 'CONTENT',
      file: relativeFile,
      hint: 'the post list is paginated under /posts/page/<n>/',
    })
  }
  const translationKey = resolveTranslationKey(frontmatter, slug, relativeFile)
  const date = parseDate(frontmatter.date, 'date', relativeFile)
  if (frontmatter.updated) parseDate(frontmatter.updated, 'updated', relativeFile)
  if (!options.includeDrafts && frontmatter.draft) return undefined
  if (!options.includeFuture && date.getTime() > Date.now()) return undefined

  const rendered = await render(parsed.body, relativeFile)
  const assetFiles = entry.assetDir ? await listAssets(entry.assetDir) : []

  return {
    lang,
    slug,
    translationKey,
    title: frontmatter.title,
    date: frontmatter.date,
    timestamp: date.getTime(),
    updated: frontmatter.updated,
    tags: [...new Set(frontmatter.tags.map((tag) => tag.trim()).filter(Boolean))],
    categories: [...new Set(frontmatter.categories.map((name) => name.trim()).filter(Boolean))],
    summary: frontmatter.summary?.trim() || rendered.excerpt,
    draft: frontmatter.draft,
    url: postPath(lang, loaded.config.locales.default, slug),
    html: raw(rendered.html),
    toc: rendered.toc,
    hasMath: rendered.hasMath,
    readingMinutes: rendered.readingMinutes,
    alternates: [],
    sourceFile: relativeFile,
    sourceDir: entry.assetDir ?? path.dirname(entry.file),
    assetFiles,
  }
}

const RESERVED_PAGE_SLUGS = new Set([
  'posts',
  'tags',
  'categories',
  'archives',
  'search',
  'page',
  '404',
])

function toPublications(
  entries: z.output<typeof publicationSchema>[] | undefined,
): Publication[] | undefined {
  if (!entries) return undefined
  return entries.map((entry) => ({
    title: entry.title,
    authors: typeof entry.authors === 'string' ? [entry.authors] : entry.authors,
    venue: entry.venue,
    year: entry.year === undefined ? undefined : String(entry.year),
    type: entry.type,
    note: entry.note,
    links: entry.links,
  }))
}

async function buildPage(
  loaded: LoadedConfig,
  lang: string,
  entry: MarkdownEntry,
  options: ScanOptions,
  render: (
    source: string,
    file: string,
  ) => Promise<{
    html: string
    toc: PageItem['toc']
    hasMath: boolean
    excerpt: string
    readingMinutes: number
  }>,
): Promise<PageItem | undefined> {
  const relativeFile = path.relative(loaded.root, entry.file).split(path.sep).join('/')
  const source = await readFile(entry.file, 'utf8')
  const parsed = splitFrontmatter(source, relativeFile)
  const checked = pageFrontmatterSchema.safeParse(parsed.data)
  if (!checked.success) {
    throw new BuildError(`Invalid page frontmatter: ${formatIssues(checked.error)}`, {
      code: 'CONTENT',
      file: relativeFile,
    })
  }

  const frontmatter = checked.data
  const slug = resolveSlug(frontmatter, entry.name, relativeFile)
  if (RESERVED_PAGE_SLUGS.has(slug)) {
    throw new BuildError(`Page slug "${slug}" is reserved`, { code: 'CONTENT', file: relativeFile })
  }
  if (lang !== loaded.config.locales.default && slug === lang) {
    throw new BuildError(`Page slug "${slug}" conflicts with a language prefix`, {
      code: 'CONTENT',
      file: relativeFile,
    })
  }
  const translationKey = resolveTranslationKey(frontmatter, slug, relativeFile)
  if (frontmatter.date) parseDate(frontmatter.date, 'date', relativeFile)
  if (frontmatter.updated) parseDate(frontmatter.updated, 'updated', relativeFile)
  if (!options.includeDrafts && frontmatter.draft) return undefined

  const rendered = await render(parsed.body, relativeFile)
  const assetFiles = entry.assetDir ? await listAssets(entry.assetDir) : []

  return {
    lang,
    slug,
    translationKey,
    title: frontmatter.title,
    publications: toPublications(frontmatter.publications),
    summary: frontmatter.description?.trim() || frontmatter.summary?.trim() || rendered.excerpt,
    draft: frontmatter.draft,
    url: pagePath(lang, loaded.config.locales.default, slug),
    html: raw(rendered.html),
    toc: rendered.toc,
    hasMath: rendered.hasMath,
    alternates: [],
    sourceFile: relativeFile,
    sourceDir: entry.assetDir ?? path.dirname(entry.file),
    assetFiles,
  }
}

function linkTranslations<
  T extends {
    lang: string
    translationKey: string
    title: string
    url: string
    alternates: Alternate[]
  },
>(itemsByLang: Record<string, T[]>, loaded: LoadedConfig): void {
  const groups = new Map<string, T[]>()
  for (const lang of Object.keys(itemsByLang)) {
    for (const item of itemsByLang[lang] ?? []) {
      const key = item.translationKey
      const group = groups.get(key) ?? []
      group.push(item)
      groups.set(key, group)
    }
  }

  const localeOrder = Object.keys(loaded.config.locales.entries)
  for (const group of groups.values()) {
    const alternates = [...group]
      .sort((a, b) => localeOrder.indexOf(a.lang) - localeOrder.indexOf(b.lang))
      .map((item) => ({
        lang: item.lang,
        label: loaded.config.locales.entries[item.lang]?.label ?? item.lang,
        url: item.url,
        title: item.title,
      }))
    for (const item of group) item.alternates = alternates
  }
}

function buildTaxonomy(
  posts: Post[],
  names: (post: Post) => string[],
  urlFor: (slug: string) => string,
  label: string,
): TagView[] {
  const counts = new Map<string, number>()
  for (const post of posts) {
    for (const name of names(post)) counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  const slugOwner = new Map<string, string>()
  const items: TagView[] = []
  for (const [name, count] of counts) {
    const slug = tagSlug(name)
    const owner = slugOwner.get(slug)
    if (owner && owner !== name) {
      throw new BuildError(`${label} "${owner}" and "${name}" produce the same slug "${slug}"`, {
        code: 'CONTENT',
        hint: 'rename one of them or add a manual alias',
      })
    }
    slugOwner.set(slug, name)
    items.push({ name, slug, url: urlFor(slug), count })
  }

  return items.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

function buildTags(posts: Post[], lang: string, loaded: LoadedConfig): TagView[] {
  const defaultLang = loaded.config.locales.default
  return buildTaxonomy(
    posts,
    (post) => post.tags,
    (slug) => tagPath(lang, defaultLang, slug),
    'Tags',
  )
}

function buildCategories(posts: Post[], lang: string, loaded: LoadedConfig): CategoryView[] {
  const defaultLang = loaded.config.locales.default
  return buildTaxonomy(
    posts,
    (post) => post.categories,
    (slug) => categoryPath(lang, defaultLang, slug),
    'Categories',
  )
}

function buildArchives(posts: Post[], timeZone: string): ArchiveGroup[] {
  const groups = new Map<number, Post[]>()
  for (const post of posts) {
    const year = Number(yearOf(new Date(post.timestamp), timeZone))
    const group = groups.get(year) ?? []
    group.push(post)
    groups.set(year, group)
  }
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, group]) => ({ year, posts: group }))
}

export async function scanContent(loaded: LoadedConfig, options: ScanOptions): Promise<ContentSet> {
  const renderer = createMarkdownRenderer(loaded.config, loaded.root)
  const render = (source: string, file: string) => renderer.render(source, file)
  const languages = Object.keys(loaded.config.locales.entries)
  const postsByLang: Record<string, Post[]> = {}
  const pagesByLang: Record<string, PageItem[]> = {}
  const warnings: string[] = []

  for (const lang of languages) {
    const postsDir = path.join(loaded.root, 'content', lang, 'posts')
    const pagesDir = path.join(loaded.root, 'content', lang, 'pages')
    const postEntries = await listMarkdownEntries(postsDir)
    const pageEntries = await listMarkdownEntries(pagesDir)

    const posts = (
      await Promise.all(postEntries.map((entry) => buildPost(loaded, lang, entry, options, render)))
    ).filter((post): post is Post => post !== undefined)
    const pages = (
      await Promise.all(pageEntries.map((entry) => buildPage(loaded, lang, entry, options, render)))
    )
      .filter((page): page is PageItem => page !== undefined)
      // the publications page only exists when the feature is on
      .filter((page) => loaded.config.features.publications || page.slug !== 'publications')

    checkDuplicate(posts, lang, 'post')
    checkDuplicate(pages, lang, 'page')

    posts.sort(
      (a, b) => b.timestamp - a.timestamp || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0),
    )
    pages.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))

    posts.forEach((post, index) => {
      const newer = posts[index - 1]
      const older = posts[index + 1]
      if (newer) post.next = { title: newer.title, url: newer.url }
      if (older) post.prev = { title: older.title, url: older.url }
    })

    postsByLang[lang] = posts
    pagesByLang[lang] = pages
    if (posts.length === 0) warnings.push(`No published posts for locale "${lang}"`)
  }

  linkTranslations(postsByLang, loaded)
  linkTranslations(pagesByLang, loaded)

  const tagsByLang: Record<string, TagView[]> = {}
  const categoriesByLang: Record<string, CategoryView[]> = {}
  const archivesByLang: Record<string, ArchiveGroup[]> = {}
  for (const lang of languages) {
    const posts = postsByLang[lang] ?? []
    tagsByLang[lang] = buildTags(posts, lang, loaded)
    categoriesByLang[lang] = buildCategories(posts, lang, loaded)
    archivesByLang[lang] = buildArchives(posts, loaded.config.site.timezone)
  }

  const knownLanguages = new Set(languages)
  try {
    const contentDirs = await readdir(path.join(loaded.root, 'content'), { withFileTypes: true })
    for (const entry of contentDirs) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.')) continue
      if (!knownLanguages.has(entry.name)) {
        warnings.push(`content/${entry.name}/ is not listed in locales.entries and was ignored`)
      }
    }
  } catch {
    // A missing content directory is reported by the empty-post warning above.
  }

  if (loaded.config.home.layout === 'profile') {
    const slug = loaded.config.home.page
    for (const lang of languages) {
      if (!(pagesByLang[lang] ?? []).some((page) => page.slug === slug)) {
        throw new BuildError(
          `home.layout is "profile" but content/${lang}/pages/${slug}.md is missing`,
          {
            code: 'CONTENT',
            hint: 'add the page, point home.page at an existing page, or use home.layout "posts"',
          },
        )
      }
    }
  }

  return { postsByLang, pagesByLang, tagsByLang, categoriesByLang, archivesByLang, warnings }
}
