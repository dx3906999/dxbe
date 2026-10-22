import { spawn } from 'node:child_process'
import path from 'node:path'
import { watch } from 'chokidar'
import { loadConfig } from '../core/config.ts'
import { formatError } from '../shared/errors.ts'
import { Logger } from '../shared/logger.ts'
import { parseArgs } from './args.ts'
import { type StaticServer, startStaticServer } from './server.ts'

interface BuildRun {
  code: number | null
  output: string
}

function runChildBuild(
  cliEntry: string,
  root: string,
  base: string,
  theme: string | undefined,
  outDir: string,
): Promise<BuildRun> {
  return new Promise((resolve, reject) => {
    const args = [cliEntry, 'build', '--dev', `--out=${outDir}`]
    if (base && base !== '/') args.push(`--base=${base}`)
    if (theme) args.push(`--theme=${theme}`)
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8')
    })
    child.on('error', reject)
    child.on('close', (code) => resolve({ code, output: output.trim() }))
  })
}

export async function runDev(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv)
  const logger = new Logger(args.flags.has('--verbose') ? 'debug' : 'info')
  const root = process.cwd()
  const cliEntry = process.argv[1]
  if (!cliEntry) throw new Error('Unable to locate the dxbe CLI entry')

  const baseOverride = args.options.get('--base')
  const theme = args.options.get('--theme')
  const loaded = await loadConfig({
    root,
    base: baseOverride,
    theme,
    production: false,
  })

  const port = Number(args.options.get('--port') ?? 4000)
  const outDir = path.join('.dev-dist', String(port))
  const initial = await runChildBuild(cliEntry, root, loaded.config.site.base, theme, outDir)
  if (initial.code !== 0) {
    console.error(initial.output)
    process.exit(1)
  }

  const server: StaticServer = await startStaticServer({
    root: path.join(root, outDir),
    base: loaded.base,
    port,
    dev: true,
  })
  logger.info(`dev: ${server.url}`)
  logger.info('watching content/, themes/, public/, i18n/, site.config.ts')

  let timer: NodeJS.Timeout | undefined
  let building = false
  let pending = false

  const rebuild = async (): Promise<void> => {
    if (building) {
      pending = true
      return
    }
    building = true
    try {
      const result = await runChildBuild(cliEntry, root, loaded.config.site.base, theme, outDir)
      if (result.code === 0) {
        logger.info('rebuilt')
        server.broadcastReload()
      } else {
        logger.error(result.output || 'Build failed')
        server.broadcastError(result.output || 'Build failed')
      }
    } catch (error) {
      logger.error(formatError(error))
      server.broadcastError(formatError(error))
    } finally {
      building = false
      if (pending) {
        pending = false
        await rebuild()
      }
    }
  }

  const watcher = watch(
    [
      path.join(root, 'content'),
      path.join(root, 'themes'),
      path.join(root, 'public'),
      path.join(root, 'i18n'),
      path.join(root, 'site.config.ts'),
    ],
    {
      ignoreInitial: true,
      ignored: (filePath: string) =>
        filePath.includes(`${path.sep}node_modules${path.sep}`) ||
        filePath.includes(`${path.sep}.dev-dist`) ||
        filePath.includes(`${path.sep}.cache${path.sep}`) ||
        filePath.includes(`${path.sep}dist${path.sep}`) ||
        filePath.includes(`${path.sep}.build-tmp`),
    },
  )

  watcher.on('all', () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      void rebuild()
    }, 150)
  })

  const shutdown = async (): Promise<void> => {
    if (timer) clearTimeout(timer)
    await watcher.close()
    await server.close()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
