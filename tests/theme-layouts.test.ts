import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { PageKind } from '../src/core/types.ts'
import type { Theme } from '../src/theme/api.ts'

const KINDS: PageKind[] = [
  'index',
  'home',
  'post',
  'page',
  'publications',
  'archive',
  'tag',
  'tags',
  'category',
  'categories',
  'search',
  'notFound',
]

describe('built-in themes', () => {
  it('implement every page kind instead of falling back', async () => {
    const root = path.join(process.cwd(), 'themes')
    const names = (await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
    expect(names.length).toBeGreaterThanOrEqual(5)

    const missing: string[] = []
    for (const name of names) {
      const entry = pathToFileURL(path.join(root, name, 'theme.ts')).href
      const theme = (await import(entry)).default as Theme
      for (const kind of KINDS) {
        if (!theme.layouts[kind]) missing.push(`${name}.${kind}`)
      }
    }
    expect(missing).toEqual([])
  })
})
