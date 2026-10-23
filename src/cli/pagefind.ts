import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Logger } from '../shared/logger.ts'

export interface RunIndexOptions {
  siteDir?: string
  quiet?: boolean
}

export async function runIndex(options: RunIndexOptions = {}): Promise<void> {
  const logger = new Logger()
  const label = options.siteDir ?? 'dist'
  const siteDir = path.resolve(label)
  const pagefindEntry = fileURLToPath(import.meta.resolve('pagefind'))
  const pagefindRoot = path.resolve(path.dirname(pagefindEntry), '..')
  const manifest = JSON.parse(await readFile(path.join(pagefindRoot, 'package.json'), 'utf8')) as {
    bin: string | Record<string, string>
  }
  const relativeBin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin.pagefind
  if (!relativeBin) {
    throw new Error('Pagefind CLI entry was not found')
  }

  const args = [
    path.resolve(pagefindRoot, relativeBin),
    '--site',
    siteDir,
    '--output-subdir',
    'pagefind',
    '--exclude-selectors',
    'pre, .katex',
  ]

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: options.quiet ? 'ignore' : 'inherit' })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Pagefind exited with code ${code}`))
    })
  })
  if (!options.quiet) logger.info(`indexed ${label} -> ${path.join(label, 'pagefind')}`)
}
