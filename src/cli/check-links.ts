import type { Stats } from 'node:fs'
import { access, readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { load } from 'cheerio'
import { decodePath, isExternal, stripBase } from '../shared/url.ts'

interface Manifest {
  base: string
  url: string
}

const SELECTORS = [
  ['a[href]', 'href'],
  ['link[href]', 'href'],
  ['script[src]', 'src'],
  ['img[src]', 'src'],
  ['source[src]', 'src'],
  ['video[src]', 'src'],
  ['audio[src]', 'src'],
  ['object[data]', 'data'],
  ['iframe[src]', 'src'],
  ['embed[src]', 'src'],
] as const

async function walk(dir: string, result: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'pagefind') continue
      await walk(full, result)
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      result.push(full)
    }
  }
  return result
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

function targetFile(root: string, sourceFile: string, hrefPath: string, base: string): string {
  let target: string
  if (hrefPath.startsWith('/')) {
    const withoutBase = stripBase(decodePath(hrefPath), base).replace(/^\/+/, '')
    target = path.join(root, withoutBase)
  } else {
    target = path.resolve(path.dirname(sourceFile), decodePath(hrefPath))
  }
  if (hrefPath === '/' || hrefPath.endsWith('/')) return path.join(target, 'index.html')
  return target
}

export async function runCheckLinks(): Promise<void> {
  const root = path.resolve('dist')
  const manifest = JSON.parse(
    await readFile(path.join(root, 'build-manifest.json'), 'utf8'),
  ) as Manifest
  const files = await walk(root)
  const errors: string[] = []
  let checked = 0

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    const $ = load(source)
    const links: Array<[string, string]> = []

    for (const [selector, attribute] of SELECTORS) {
      $(selector).each((_, element) => {
        const value = $(element).attr(attribute)
        if (!value || value === '#' || value.startsWith('?') || isExternal(value)) return
        links.push([attribute, value])
      })
    }

    for (const [attribute, value] of links) {
      checked += 1
      const [beforeHash, hash] = value.split('#')
      const hrefPath = (beforeHash ?? '').split('?')[0] ?? ''

      if (hrefPath.startsWith('/') && manifest.base && !hrefPath.startsWith(manifest.base)) {
        errors.push(
          `${path.relative(root, file)}: ${attribute}="${value}" does not include base ${manifest.base}`,
        )
        continue
      }

      const target = hrefPath === '' ? file : targetFile(root, file, hrefPath, manifest.base)
      const relativeTarget = path.relative(root, target)
      if (relativeTarget.startsWith('..')) {
        errors.push(`${path.relative(root, file)}: ${attribute}="${value}" escapes dist`)
        continue
      }

      let targetStat: Stats
      try {
        targetStat = await stat(target)
      } catch {
        errors.push(
          `${path.relative(root, file)}: ${attribute}="${value}" -> missing ${path.relative(root, target)}`,
        )
        continue
      }

      if (targetStat.isDirectory()) {
        const indexFile = path.join(target, 'index.html')
        if (!(await exists(indexFile))) {
          errors.push(`${path.relative(root, file)}: ${attribute}="${value}" -> missing index.html`)
        }
        continue
      }

      if (hash && hash.length > 0 && target.endsWith('.html')) {
        const targetHtml = await readFile(target, 'utf8')
        const $target = load(targetHtml)
        const decodedHash = decodeURIComponent(hash)
        const escaped = decodedHash.replaceAll('"', '\\"')
        const found =
          $target(`[id="${escaped}"]`).length > 0 || $target(`a[name="${escaped}"]`).length > 0
        if (!found) {
          errors.push(
            `${path.relative(root, file)}: ${attribute}="${value}" -> missing anchor #${decodedHash}`,
          )
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error(`link check failed: ${errors.length} issue(s) across ${checked} links`)
    for (const error of errors) console.error(`  ${error}`)
    process.exit(1)
  }
  console.log(`link check: ${checked} links across ${files.length} pages`)
}
