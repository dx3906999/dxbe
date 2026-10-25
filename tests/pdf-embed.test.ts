import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadConfig } from '../src/core/config.ts'
import { createMarkdownRenderer } from '../src/core/markdown.ts'

let cacheRoot: string

beforeEach(async () => {
  cacheRoot = await mkdtemp(path.join(os.tmpdir(), 'dxbe-pdf-'))
})

afterEach(async () => {
  await rm(cacheRoot, { recursive: true, force: true })
})

async function render(source: string, base?: string): Promise<string> {
  const loaded = await loadConfig({ root: process.cwd(), base })
  const renderer = createMarkdownRenderer(loaded.config, cacheRoot)
  return (await renderer.render(source, 'pdf.md')).html
}

describe('markdown pdf embeds', () => {
  it('turns a standalone PDF image into an embedded viewer with a link', async () => {
    const html = await render('![Thesis draft](thesis.pdf)')
    expect(html).toContain('<figure class="pdf-embed">')
    expect(html).toContain('data="thesis.pdf"')
    expect(html).toContain('type="application/pdf"')
    expect(html).toContain('<a href="thesis.pdf">Thesis draft</a>')
    expect(html).not.toContain('<img')
    expect(html).not.toMatch(/<p>\s*<figure/)
  })

  it('keeps fragments, prefers the title as caption, and falls back to the file name', async () => {
    const html = await render(
      ['![Slides](talk.pdf#page=3 "Talk slides, page 3")', '![](files/Report%202026.PDF)'].join(
        '\n\n',
      ),
    )
    expect(html).toContain('data="talk.pdf#page=3"')
    expect(html).toContain('>Talk slides, page 3</a>')
    expect(html).toContain('data="files/Report%202026.PDF"')
    expect(html).toContain('>Report 2026.PDF</a>')
  })

  it('renders an inline PDF image as a plain link', async () => {
    const html = await render('See ![the paper](paper.pdf) for details.')
    expect(html).toContain('<p>See <a href="paper.pdf">the paper</a> for details.</p>')
    expect(html).not.toContain('<object')
  })

  it('applies the site base to root-relative PDFs', async () => {
    const html = await render('![Paper](/files/paper.pdf)', '/demo/')
    expect(html).toContain('data="/demo/files/paper.pdf"')
    expect(html).toContain('href="/demo/files/paper.pdf"')
  })

  it('leaves ordinary images alone', async () => {
    const html = await render('![Cover](cover.png)')
    expect(html).toContain('<img src="cover.png" alt="Cover">')
    expect(html).not.toContain('pdf-embed')
  })
})
