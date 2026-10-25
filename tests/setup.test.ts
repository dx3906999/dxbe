import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const cli = path.join(process.cwd(), 'src', 'cli', 'index.ts')
let dir: string

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'dxbe-setup-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

function setup(): string {
  const result = spawnSync(
    process.execPath,
    [cli, 'setup', '--yes', '--name', 'Test', '--url', 'https://test.github.io'],
    { cwd: dir, encoding: 'utf8' },
  )
  expect(result.status, result.stderr).toBe(0)
  return result.stdout
}

describe('dxbe setup', () => {
  it('turns a fresh npm init project into a buildable blog repository', async () => {
    // what `npm init -y` writes with current npm
    await writeFile(
      path.join(dir, 'package.json'),
      `${JSON.stringify({ name: 'my-blog', type: 'commonjs', scripts: { test: 'echo' } }, null, 2)}\n`,
    )
    const output = setup()

    const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'))
    expect(pkg.type).toBe('module')
    expect(pkg.scripts.test).toBe('echo')
    expect(pkg.scripts.dev).toBe('dxbe dev')
    expect(pkg.scripts.check).toBe('dxbe check')
    expect(await readFile(path.join(dir, '.nvmrc'), 'utf8')).toBe('24\n')
    const gitignore = await readFile(path.join(dir, '.gitignore'), 'utf8')
    expect(gitignore).toContain('node_modules/')
    expect(gitignore).toContain('dist/')
    expect(output).toContain('"type": "module"')
  })

  it('keeps existing scripts, .nvmrc, and .gitignore lines', async () => {
    await writeFile(
      path.join(dir, 'package.json'),
      `${JSON.stringify({ name: 'my-blog', type: 'module', scripts: { dev: 'custom' } }, null, 2)}\n`,
    )
    await writeFile(path.join(dir, '.nvmrc'), '25\n')
    await writeFile(path.join(dir, '.gitignore'), 'secrets/\ndist/')
    setup()

    const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'))
    expect(pkg.scripts.dev).toBe('custom')
    expect(pkg.scripts.build).toBe('dxbe build')
    expect(await readFile(path.join(dir, '.nvmrc'), 'utf8')).toBe('25\n')
    const gitignore = (await readFile(path.join(dir, '.gitignore'), 'utf8')).split('\n')
    expect(gitignore.slice(0, 3)).toEqual(['secrets/', 'dist/', 'node_modules/'])
    expect(gitignore.filter((line) => line === 'dist/')).toHaveLength(1)
  })
})
