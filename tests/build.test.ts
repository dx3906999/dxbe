import { access, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type BuildResult, buildSite } from '../src/core/build.ts'
import { loadConfig } from '../src/core/config.ts'
import { Logger } from '../src/shared/logger.ts'

const root = process.cwd()
const outDir = '.test-dist'
let result: BuildResult

beforeAll(async () => {
  const loaded = await loadConfig({ root, production: false })
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
