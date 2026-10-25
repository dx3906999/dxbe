import { formatError } from '../shared/errors.ts'
import { runBuild } from './build.ts'
import { runCheckDeterministic } from './check-deterministic.ts'
import { runCheckLinks } from './check-links.ts'
import { runCheckSeo } from './check-seo.ts'
import { runCheckTheme } from './check-theme.ts'
import { runClean } from './clean.ts'
import { runDeploy } from './deploy.ts'
import { runDev } from './dev.ts'
import { commandHelp, generalHelp, isHelpFlag, version } from './help.ts'
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
  deploy: runDeploy,
  setup: runSetup,
  index: () => runIndex(),
  check: runCheck,
  'check:links': runCheckLinks,
  'check:seo': runCheckSeo,
  'check:theme': runCheckTheme,
  'check:deterministic': runCheckDeterministic,
  smoke: runSmoke,
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2)
  if (!command || isHelpFlag(command)) {
    console.log(generalHelp())
    return
  }
  if (command === '--version' || command === '-v') {
    console.log(version())
    return
  }
  if (command === 'help') {
    const topic = args[0]
    const help = topic ? commandHelp(topic) : generalHelp()
    if (!help) {
      console.error(`Unknown command "${topic}"
`)
      console.log(generalHelp())
      process.exit(1)
    }
    console.log(help)
    return
  }

  const runner = COMMANDS[command]
  if (!runner) {
    console.error(`Unknown command "${command}"
`)
    console.log(generalHelp())
    process.exit(1)
  }
  if (args.some(isHelpFlag)) {
    console.log(commandHelp(command))
    return
  }

  await runner(args)
}

main().catch((error: unknown) => {
  console.error(formatError(error))
  process.exit(1)
})
