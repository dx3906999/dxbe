import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadConfig } from '../src/core/config.ts'
import { createMarkdownRenderer } from '../src/core/markdown.ts'
import { copyKatexAssets } from '../src/theme/loader.ts'

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(path.join(os.tmpdir(), 'dxbe-math-'))
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

async function render(source: string) {
  const loaded = await loadConfig({ root: process.cwd() })
  return createMarkdownRenderer(loaded.config, tmp).render(source, 'math.md')
}

describe('math rendering', () => {
  it('ships the stylesheet of the KaTeX that renders the markup', async () => {
    const { html } = await render(['$$', String.raw`\begin{align}a&=b\end{align}`, '$$'].join('\n'))
    const tag = html.match(/<span class="([\w-]*tag)">/)?.[1]
    expect(tag).toBeDefined()
    await copyKatexAssets(tmp, '/')
    const css = await readFile(path.join(tmp, 'assets', 'vendor', 'katex', 'katex.min.css'), 'utf8')
    // equation numbers are only pushed to the right edge when the class names agree
    expect(css).toContain(`.katex-display>.katex>.katex-html>.${tag}{position:absolute`)
  })

  it('keeps numbered equations inside the display box in every theme', async () => {
    for (const theme of ['apogee', 'capstan', 'folio', 'orbital', 'scholar']) {
      const css = await readFile(path.join('themes', theme, 'assets', 'css', 'site.css'), 'utf8')
      expect(css, theme).toMatch(/\.katex-display \.tag \.vlist-t2 \{\s*margin-right: 0;/)
    }
  })

  it('keeps only the visible glyphs of heading math in the TOC', async () => {
    const { toc } = await render(['## $\\nabla$ rules', 'body'].join('\n\n'))
    expect(toc.map((entry) => entry.text)).toEqual(['∇ rules'])
  })
})
