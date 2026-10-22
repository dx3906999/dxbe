import { formatError } from '../shared/errors.ts'
import { runBuild } from './build.ts'
import { runCheckDeterministic } from './check-deterministic.ts'
import { runCheckLinks } from './check-links.ts'
import { runCheckSeo } from './check-seo.ts'
import { runCheckTheme } from './check-theme.ts'
import { runClean } from './clean.ts'
import { runDev } from './dev.ts'
import { runNew } from './new.ts'
import { runIndex } from './pagefind.ts'
import { runPreview } from './preview.ts'
import { runSetup } from './setup.ts'
import { runSmoke } from './smoke.ts'

async function runCheck(argv: string[]): Promise<void> {
  await runBuild(argv)
  await runCheckLinks()
  await runCheckSeo()
  await runCheckTheme([])
  await runIndex()
}

const COMMANDS: Record<string, (argv: string[]) => Promise<void>> = {
  build: runBuild,
  dev: runDev,
  preview: runPreview,
  new: runNew,
  clean: runClean,
  setup: runSetup,
  index: runIndex,
  check: runCheck,
  'check:links': runCheckLinks,
  'check:seo': runCheckSeo,
  'check:theme': runCheckTheme,
  'check:deterministic': runCheckDeterministic,
  smoke: runSmoke,
}

function printHelp(): void {
  console.log(`dxbe

Usage:
  dxbe <command> [options]

Commands:
  build              Build the site into dist/
  dev                Start a development server
  preview            Serve an existing dist/
  new                Create a post scaffold
  clean              Remove generated directories
  setup              Create or update site.config.ts
  index              Build the Pagefind index into dist/pagefind/
  check              Build, check links/SEO/themes, and build the index
  check:links        Check internal links in dist/
  check:seo          Check metadata, feeds, and sitemap
  check:theme        Build every theme against the current site
  check:deterministic Compare two builds
  smoke              Post-deploy smoke test (BASE_URL required)

Options are command-specific. Run a command after editing site.config.ts.`)
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2)
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    printHelp()
    return
  }

  const runner = COMMANDS[command]
  if (!runner) {
    console.error(`Unknown command "${command}"`)
    printHelp()
    process.exit(1)
  }

  await runner(args)
}

main().catch((error: unknown) => {
  console.error(formatError(error))
  process.exit(1)
})
