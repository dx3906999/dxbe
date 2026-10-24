import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadConfig } from '../src/core/config.ts'

const tempDirs: string[] = []

async function fixture(source: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dxbe-config-'))
  tempDirs.push(dir)
  await writeFile(path.join(dir, 'site.config.ts'), source, 'utf8')
  return dir
}

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true })
  }
})

const baseConfig = (site: string): string => `export default {
  identity: { author: { name: 'Test Author' } },
  locales: {
    default: 'zh',
    entries: {
      zh: { label: '中文', title: 'Test', description: 'Test description' },
    },
  },
  site: ${site},
  theme: { name: 'folio', config: {} },
}
`

describe('config loading', () => {
  it('keeps the post list as the home and publications off by default', async () => {
    const root = await fixture(baseConfig(`{ url: 'http://localhost:4000' }`))
    const loaded = await loadConfig({ root, production: false })
    expect(loaded.config.home).toEqual({ layout: 'posts', page: 'home' })
    expect(loaded.config.features.publications).toBe(false)
  })

  it('normalizes a custom domain and uses it as the origin', async () => {
    const previousUrl = process.env.SITE_URL
    const previousBase = process.env.SITE_BASE
    delete process.env.SITE_URL
    delete process.env.SITE_BASE
    try {
      const root = await fixture(
        baseConfig(`{
          url: 'http://localhost:4000',
          base: '/',
          customDomain: 'https://blog.example.com/',
        }`),
      )
      const loaded = await loadConfig({ root, production: false })
      expect(loaded.url).toBe('https://blog.example.com')
      expect(loaded.config.site.customDomain).toBe('blog.example.com')
      expect(loaded.base).toBe('')
      expect(loaded.config.site.base).toBe('/')
    } finally {
      if (previousUrl !== undefined) process.env.SITE_URL = previousUrl
      if (previousBase !== undefined) process.env.SITE_BASE = previousBase
    }
  })

  it('rejects a base path that looks like a Windows path', async () => {
    const previousUrl = process.env.SITE_URL
    const previousBase = process.env.SITE_BASE
    delete process.env.SITE_URL
    delete process.env.SITE_BASE
    try {
      const root = await fixture(
        baseConfig(`{
          url: 'https://example.com',
          base: 'C:/Users/demo/blog',
        }`),
      )
      await expect(loadConfig({ root, production: false })).rejects.toThrow(
        /base must be a URL path/,
      )
    } finally {
      if (previousUrl !== undefined) process.env.SITE_URL = previousUrl
      if (previousBase !== undefined) process.env.SITE_BASE = previousBase
    }
  })
})
