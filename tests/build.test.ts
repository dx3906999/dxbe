import { access, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type BuildResult, buildSite } from '../src/core/build.ts'
import { type LoadedConfig, loadConfig } from '../src/core/config.ts'
import { Logger } from '../src/shared/logger.ts'
import { absoluteUrl } from '../src/shared/url.ts'

const root = process.cwd()
const outDir = '.test-dist'
let loaded: LoadedConfig
let result: BuildResult

beforeAll(async () => {
  loaded = await loadConfig({ root, production: false })
  result = await buildSite(loaded, {
    outDir,
    atomic: false,
    includeDrafts: false,
    includeFuture: false,
    logger: new Logger('error'),
  })
})

afterAll(async () => {
  await rm(path.join(root, outDir), { recursive: true, force: true })
})

describe('site build', () => {
  it('renders both languages at the expected roots', async () => {
    const zh = await readFile(path.join(root, outDir, 'index.html'), 'utf8')
    const en = await readFile(path.join(root, outDir, 'en', 'index.html'), 'utf8')
    expect(zh).toContain('lang="zh"')
    expect(en).toContain('lang="en"')
    expect(zh).not.toContain('href="/zh/"')
    expect(zh).toContain('data-language="en"')
    expect(zh).toContain('navigator.languages')
    expect(en).toContain('<a href="/en/" aria-current="page">Home</a>')
  })

  it('renders a post with math, search metadata, and anchors', async () => {
    const post = result.tasks.find((task) => task.kind === 'post')
    expect(post).toBeDefined()
    const html = await readFile(path.join(root, outDir, post?.outFile ?? ''), 'utf8')
    expect(html).toContain('data-pagefind-body')
    expect(html).toContain('data-pagefind-filter="lang:')
    expect(html).toContain('class="katex"')
    expect(html).not.toContain('katex-error')
    expect(html).toContain('class="toc"')
  })

  it('keeps the language home out of the current state on inner pages', async () => {
    const enPost = result.tasks.find((task) => task.lang === 'en' && task.kind === 'post')
    expect(enPost).toBeDefined()
    const html = await readFile(path.join(root, outDir, enPost?.outFile ?? ''), 'utf8')
    expect(html).not.toContain('<a href="/en/" aria-current="page">')
    expect(html).toContain('<a href="/en/" aria-current="false">Home</a>')
  })

  it('renders the profile home and moves the post list to /posts/', async () => {
    const home = result.tasks.find((task) => task.lang === 'zh' && task.urlPath === '/')
    expect(home?.kind).toBe('home')
    expect(home?.pageItem?.slug).toBe('home')
    // the profile page is the home, not a page of its own
    expect(result.tasks.some((task) => task.urlPath === '/home/')).toBe(false)
    const list = result.tasks.find((task) => task.lang === 'en' && task.urlPath === '/en/posts/')
    expect(list?.kind).toBe('index')
    expect(list?.posts?.length).toBeGreaterThan(0)
    const html = await readFile(path.join(root, outDir, 'posts', 'index.html'), 'utf8')
    // CI overrides SITE_URL, so derive the expected origin from the loaded config
    const canonical = absoluteUrl(loaded.url, loaded.base, '/posts/')
    expect(html).toContain(`<link rel="canonical" href="${canonical}">`)
  })

  it('builds category pages from post frontmatter', async () => {
    const index = result.tasks.find((task) => task.lang === 'zh' && task.kind === 'categories')
    expect(index?.urlPath).toBe('/categories/')
    expect(index?.categories?.length).toBeGreaterThan(0)
    const category = result.tasks.find((task) => task.lang === 'en' && task.kind === 'category')
    expect(category?.urlPath).toMatch(/^\/en\/categories\/[^/]+\/$/)
    expect(
      category?.posts?.every((post) => post.categories.includes(category.category?.name ?? '')),
    ).toBe(true)
    await expect(
      access(path.join(root, outDir, 'categories', 'index.html')),
    ).resolves.toBeUndefined()
  })

  it('renders the publications page when the feature is on', async () => {
    const page = result.tasks.find((task) => task.lang === 'zh' && task.kind === 'publications')
    expect(page?.urlPath).toBe('/publications/')
    expect(page?.pageItem?.publications?.[0]?.authors.length).toBeGreaterThan(0)
    // the entries live in frontmatter, so the theme has to print them
    const html = await readFile(path.join(root, outDir, 'publications', 'index.html'), 'utf8')
    expect(html).toContain(page?.pageItem?.publications?.[0]?.title ?? '(missing)')
  })

  it('copies a post PDF next to the post and embeds it', async () => {
    const post = path.join(root, outDir, 'posts', 'typography-notes')
    await expect(access(path.join(post, 'type-specimen.pdf'))).resolves.toBeUndefined()
    const html = await readFile(path.join(post, 'index.html'), 'utf8')
    expect(html).toContain('<object class="pdf-embed__frame" data="type-specimen.pdf"')
  })

  it('gives feed entries a base so relative asset links resolve', async () => {
    const atom = await readFile(path.join(root, outDir, 'atom.xml'), 'utf8')
    const url = absoluteUrl(loaded.url, loaded.base, '/posts/typography-notes/')
    expect(atom).toContain(`<content type="html" xml:base="${url}">`)
  })

  it('writes feeds, sitemap, robots, and 404', async () => {
    for (const file of ['atom.xml', 'en/atom.xml', 'sitemap.xml', 'robots.txt', '404.html']) {
      await expect(access(path.join(root, outDir, file))).resolves.toBeUndefined()
    }
    const sitemap = await readFile(path.join(root, outDir, 'sitemap.xml'), 'utf8')
    expect(sitemap).not.toContain('/zh/')
    expect(sitemap).toContain('x-default')
  })

  it('copies the favicon and nojekyll marker', async () => {
    await expect(access(path.join(root, outDir, 'favicon.svg'))).resolves.toBeUndefined()
    await expect(access(path.join(root, outDir, '.nojekyll'))).resolves.toBeUndefined()
  })
})
