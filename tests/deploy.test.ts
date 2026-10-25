import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const cli = path.join(process.cwd(), 'src', 'cli', 'index.ts')
let dir: string
let blog: string
let target: string

// CI exports SITE_URL/SITE_BASE for the demo site; this blog sets its own
const env: NodeJS.ProcessEnv = {
  ...process.env,
  SITE_URL: undefined,
  SITE_BASE: undefined,
  GIT_AUTHOR_NAME: 'dxbe test',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'dxbe test',
  GIT_COMMITTER_EMAIL: 'test@example.invalid',
}

function run(command: string, args: string[], cwd: string) {
  return spawnSync(command, args, { cwd, env, encoding: 'utf8' })
}

function deploy(...flags: string[]) {
  return run(process.execPath, [cli, 'deploy', ...flags], blog)
}

function commits(repo: string, branch: string): string[] {
  const log = run('git', ['--git-dir', repo, 'log', '--format=%s', branch], dir)
  return log.status === 0 ? log.stdout.trim().split('\n') : []
}

async function writePost(slug: string, title: string): Promise<void> {
  const postDir = path.join(blog, 'content', 'zh', 'posts', slug)
  await mkdir(postDir, { recursive: true })
  await writeFile(
    path.join(postDir, 'index.md'),
    `---\ntitle: ${title}\ndate: 2026-10-01T10:00:00+08:00\nslug: ${slug}\n---\n\n正文。\n`,
  )
}

async function writeConfig(repo: string): Promise<void> {
  await writeFile(
    path.join(blog, 'site.config.ts'),
    `export default ${JSON.stringify({
      identity: { author: { name: 'Test' } },
      locales: {
        default: 'zh',
        entries: { zh: { label: '中文', title: '测试', description: '测试站点' } },
      },
      site: { url: 'https://test.github.io' },
      theme: { name: 'folio' },
      deploy: { repo, branch: 'gh-pages' },
    })}\n`,
  )
}

beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'dxbe-deploy-'))
  blog = path.join(dir, 'blog')
  target = path.join(dir, 'site.git').split(path.sep).join('/')
  await mkdir(blog)
  expect(run('git', ['init', '--quiet', '--bare', target], dir).status).toBe(0)
  await writeFile(path.join(blog, 'package.json'), '{ "type": "module" }\n')
  await writeConfig(target)
  await writePost('hello', '你好')
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('dxbe deploy', () => {
  it('builds, checks, and pushes dist/ to a new branch', () => {
    const result = deploy()
    expect(result.status, result.stderr || result.stdout).toBe(0)
    expect(commits(target, 'gh-pages')).toHaveLength(1)
    for (const file of ['index.html', '.nojekyll', 'posts/hello/index.html', 'pagefind']) {
      const show = run('git', ['--git-dir', target, 'cat-file', '-e', `gh-pages:${file}`], dir)
      expect(show.status, file).toBe(0)
    }
  })

  it('skips the commit when nothing changed', () => {
    const result = deploy('--skip-build')
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('nothing changed')
    expect(commits(target, 'gh-pages')).toHaveLength(1)
  })

  it('adds a commit on top of the published history', async () => {
    await writePost('second', '第二篇')
    const result = deploy()
    expect(result.status, result.stderr || result.stdout).toBe(0)
    expect(commits(target, 'gh-pages')).toHaveLength(2)
  })

  it('refuses a branch that holds site sources', async () => {
    const source = path.join(dir, 'source.git').split(path.sep).join('/')
    const work = path.join(dir, 'source-work')
    run('git', ['init', '--quiet', '--bare', source], dir)
    run('git', ['init', '--quiet', '-b', 'gh-pages', work], dir)
    await writeFile(path.join(work, 'site.config.ts'), 'export default {}\n')
    run('git', ['add', '.'], work)
    run('git', ['commit', '--quiet', '-m', 'source'], work)
    expect(run('git', ['push', '--quiet', source, 'gh-pages'], work).status).toBe(0)

    await writeConfig(source)
    try {
      const result = deploy('--skip-build')
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('Refusing to deploy')
      expect(commits(source, 'gh-pages')).toEqual(['source'])
    } finally {
      await writeConfig(target)
    }
  })
})
