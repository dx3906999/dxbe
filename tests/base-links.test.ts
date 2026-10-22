import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/core/config.ts'
import { createMarkdownRenderer } from '../src/core/markdown.ts'

describe('markdown base links', () => {
  it('prefixes site-root links and assets, but leaves external and anchor links alone', async () => {
    const cacheRoot = await mkdtemp(path.join(os.tmpdir(), 'dxbe-base-links-'))
    try {
      const loaded = await loadConfig({ root: process.cwd(), base: '/demo/' })
      const renderer = createMarkdownRenderer(loaded.config, cacheRoot)
      const result = await renderer.render(
        [
          '[About](/about/)',
          '[Root](/)',
          '[Already prefixed](/demo/about/)',
          '[External](https://example.com/x)',
          '[Anchor](#section)',
          '![Cover](/cover.png)',
        ].join('\n\n'),
        'base-links.md',
      )

      expect(result.html.match(/href="\/demo\/about\/"/g)).toHaveLength(2)
      expect(result.html).not.toContain('/demo/demo/about/')
      expect(result.html).toContain('href="/demo/"')
      expect(result.html).toContain('href="https://example.com/x"')
      expect(result.html).toContain('href="#section"')
      expect(result.html).toContain('src="/demo/cover.png"')
    } finally {
      await rm(cacheRoot, { recursive: true, force: true })
    }
  })
})
