import { spawnSync } from 'node:child_process'
import { access, cp, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { loadConfig } from '../core/config.ts'
import { BuildError } from '../shared/errors.ts'
import { Logger } from '../shared/logger.ts'
import { parseArgs } from './args.ts'
import { runBuild } from './build.ts'
import { runCheckLinks } from './check-links.ts'
import { runCheckSeo } from './check-seo.ts'
import { runIndex } from './pagefind.ts'

/** Working clone of the deploy branch, reused between deploys like hexo's .deploy_git. */
export const DEPLOY_DIR = '.deploy-git'

interface GitResult {
  ok: boolean
  stdout: string
  stderr: string
}

function git(args: string[], cwd: string): GitResult {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (result.error) {
    throw new BuildError('git was not found', {
      code: 'DEPLOY',
      hint: 'install git and make sure it is on PATH',
      cause: result.error,
    })
  }
  return { ok: result.status === 0, stdout: result.stdout.trim(), stderr: result.stderr.trim() }
}

function mustGit(args: string[], cwd: string): string {
  const result = git(args, cwd)
  if (!result.ok) {
    throw new BuildError(`git ${args[0]} failed`, {
      code: 'DEPLOY',
      hint: result.stderr || result.stdout,
    })
  }
  return result.stdout
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

/** Clone the branch, or start it as an orphan when the repository or branch is new. */
async function prepareWorkingCopy(
  root: string,
  dir: string,
  repo: string,
  branch: string,
): Promise<void> {
  if (await exists(dir)) {
    const remote = git(['remote', 'get-url', 'origin'], dir)
    if (remote.ok && remote.stdout === repo) {
      // match the remote exactly, dropping commits from an earlier --dry-run
      if (git(['fetch', '--depth', '1', 'origin', branch], dir).ok) {
        mustGit(['reset', '--hard', 'FETCH_HEAD'], dir)
      }
      return
    }
    await rm(dir, { recursive: true, force: true })
  }

  if (git(['clone', '--depth', '1', '--branch', branch, repo, dir], root).ok) return
  await rm(dir, { recursive: true, force: true })
  const reachable = git(['ls-remote', repo], root)
  if (!reachable.ok) {
    throw new BuildError(`Cannot reach deploy repository ${repo}`, {
      code: 'DEPLOY',
      hint: reachable.stderr || 'check deploy.repo and your git credentials',
    })
  }
  mustGit(['init', dir], root)
  mustGit(['remote', 'add', 'origin', repo], dir)
  mustGit(['checkout', '--orphan', branch], dir)
}

export interface DeployOptions {
  /** Commit in .deploy-git but do not push. */
  dryRun?: boolean
  /** Skip the build and checks and publish the existing dist/. */
  skipBuild?: boolean
}

/** Runs in the current directory, like the build and checks it calls. */
export async function deploySite(options: DeployOptions = {}): Promise<void> {
  const logger = new Logger()
  const root = process.cwd()
  const loaded = await loadConfig({ root, production: true })
  const target = loaded.config.deploy
  if (!target) {
    throw new BuildError('site.config.ts has no deploy target', {
      code: 'CONFIG',
      file: 'site.config.ts',
      hint: "add deploy: { repo: 'git@github.com:<user>/<user>.github.io.git', branch: 'main' }",
    })
  }

  if (!options.skipBuild) {
    await runBuild(['--production'])
    await runCheckLinks()
    await runCheckSeo()
    await runIndex()
  }

  const dist = path.join(root, 'dist')
  const dir = path.join(root, DEPLOY_DIR)
  await prepareWorkingCopy(root, dir, target.repo, target.branch)

  // a branch holding site.config.ts is someone's source, not a built site
  if (await exists(path.join(dir, 'site.config.ts'))) {
    throw new BuildError(`Refusing to deploy over ${target.repo} ${target.branch}`, {
      code: 'DEPLOY',
      hint: 'that branch contains site.config.ts; deploy.repo/branch must point at the published site, not the source',
    })
  }

  for (const entry of await readdir(dir)) {
    if (entry !== '.git') await rm(path.join(dir, entry), { recursive: true, force: true })
  }
  await cp(dist, dir, { recursive: true })

  mustGit(['add', '--all'], dir)
  if (!mustGit(['status', '--porcelain'], dir)) {
    logger.info(`deploy: nothing changed on ${target.branch}`)
    return
  }
  const message = target.message.replaceAll('{date}', new Date().toISOString())
  mustGit(['commit', '--quiet', '-m', message], dir)

  if (options.dryRun) {
    logger.info(`deploy: committed in ${DEPLOY_DIR}/ (dry run, not pushed)`)
    return
  }
  mustGit(['push', '--quiet', 'origin', `HEAD:refs/heads/${target.branch}`], dir)
  logger.info(`deploy: pushed to ${target.repo} ${target.branch}`)
  logger.info(`site: ${new URL(loaded.config.site.base, loaded.url).toString()}`)
}

export async function runDeploy(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv)
  await deploySite({
    dryRun: args.flags.has('--dry-run'),
    skipBuild: args.flags.has('--skip-build'),
  })
}
