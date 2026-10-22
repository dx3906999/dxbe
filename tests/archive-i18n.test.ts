import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildSite } from '../src/core/build.ts'
import { loadConfig } from '../src/core/config.ts'
import { Logger } from '../src/shared/logger.ts'

async function writeFixture(root: string, file: string, content: string): Promise<void> {
  const target = path.join(root, file)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, content, 'utf8')
}

describe('archive alternates with asymmetric locales', () => {
  it('does not link to a year archive that the other locale does not have', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'dxbe-archive-'))
    try {
      await writeFile(
        path.join(root, 'site.config.ts'),
        `export default {
  identity: { author: { name: 'Test' } },
  locales: {
    default: 'zh',
    entries: {
      zh: { label: '中文', title: '测试', description: '测试站点' },
      en: { label: 'English', title: 'Test', description: 'Test site' },
    },
  },
  site: { url: 'https://example.com', base: '/' },
  theme: { name: 'folio', config: {} },
}
`,
        'utf8',
      )
      await writeFixture(
        root,
        'content/zh/posts/only-zh/index.md',
        `---
title: 只有中文
date: 2026-01-01T00:00:00+08:00
slug: only-zh
translationKey: only-zh
---

正文。
`,
      )

      const loaded = await loadConfig({ root, production: false })
      await buildSite(loaded, {
        outDir: '.test-archive',
        atomic: false,
        includeDrafts: false,
        includeFuture: false,
        logger: new Logger('error'),
      })

      const html = await readFile(
        path.join(root, '.test-archive', 'archives', '2026', 'index.html'),
        'utf8',
      )
      expect(html).toContain('/en/archives/')
      expect(html).not.toContain('/en/archives/2026/')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
