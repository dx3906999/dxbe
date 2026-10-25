import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

interface CommandHelp {
  summary: string
  usage: string
  options?: Array<[string, string]>
  examples?: string[]
  notes?: string[]
}

/** One entry per command, in the order `dxbe help` lists them. */
export const COMMAND_HELP: Record<string, CommandHelp> = {
  dev: {
    summary: 'Start a development server that rebuilds on change',
    usage: 'dxbe dev [options]',
    options: [
      ['--port <n>', 'Port to listen on (default 4000)'],
      ['--theme <name>', 'Preview another theme without editing site.config.ts'],
      ['--base <path>', 'Serve under a sub-path, e.g. /my-blog'],
      ['--verbose', 'Print debug output'],
    ],
    notes: ['Drafts and future-dated posts are included. The search index is rebuilt too.'],
    examples: ['dxbe dev', 'dxbe dev --port 4400 --theme apogee'],
  },
  build: {
    summary: 'Build the site into dist/',
    usage: 'dxbe build [options]',
    options: [
      ['--production', 'Production build (same as SITE_ENV=production)'],
      ['--drafts', 'Include posts with draft: true'],
      ['--future', 'Include posts dated in the future'],
      ['--theme <name>', 'Build with another theme'],
      ['--base <path>', 'Site sub-path, e.g. /my-blog'],
      ['--out <dir>', 'Output directory (default dist)'],
      ['--verbose', 'Print debug output'],
    ],
    notes: [
      'The search index is a separate step: run `dxbe index` afterwards.',
      'Environment: SITE_URL and SITE_BASE override site.url and site.base.',
    ],
    examples: ['dxbe build', 'dxbe build --production && dxbe index'],
  },
  preview: {
    summary: 'Serve an existing dist/ as a static site',
    usage: 'dxbe preview [options]',
    options: [
      ['--port <n>', 'Port to listen on (default 4000)'],
      ['--base <path>', 'Site sub-path the build was made for'],
    ],
    examples: ['dxbe build && dxbe index && dxbe preview'],
  },
  new: {
    summary: 'Create a post folder with frontmatter',
    usage: 'dxbe new "<title>" [options]',
    options: [
      ['--slug <slug>', 'Folder and URL name: a-z, 0-9 and hyphens (needed for non-ASCII titles)'],
      ['--lang <code>', 'Language folder (default: locales.default)'],
      ['--tags <a,b>', 'Comma-separated tags'],
      ['--date <iso>', 'Publish date with a time zone offset (default: now)'],
      ['--draft', 'Mark the post as a draft'],
      ['--translation-key <k>', 'Link translations (default: the slug)'],
    ],
    notes: ['Creates content/<lang>/posts/<slug>/index.md. Put images (and a cover) beside it.'],
    examples: [
      'dxbe new "这个站点是怎么搭起来的" --slug how-this-site-works --tags 工程,静态站点',
      'dxbe new "How this site works" --slug how-this-site-works --lang en',
    ],
  },
  setup: {
    summary: 'Create or update site.config.ts and the blog scaffolding',
    usage: 'dxbe setup [options]',
    options: [
      ['--yes', 'Do not ask; use flags and defaults'],
      ['--force', 'Overwrite an existing site.config.ts (a .bak copy is kept)'],
      ['--name <name>', 'Author name'],
      ['--email <email>', 'Author email'],
      ['--homepage <url>', 'Author homepage'],
      ['--github <url>', 'GitHub profile URL for the social link'],
      ['--url <origin>', 'Production origin, e.g. https://example.com'],
      ['--domain <host>', 'Custom domain, written to dist/CNAME'],
      ['--theme <name>', 'folio, orbital, scholar, apogee or capstan'],
      ['--title-zh / --title-en <text>', 'Site titles'],
      ['--description-zh / --description-en <text>', 'Site descriptions'],
      ['--tagline-zh / --tagline-en <text>', 'Short subtitles'],
      ['--repo-owner / --repo-name <text>', 'Source repository for the footer link'],
    ],
    examples: [
      'dxbe setup',
      'dxbe setup --yes --force --name "Your Name" --url https://example.com',
    ],
  },
  deploy: {
    summary: 'Build, check, and push dist/ to deploy.repo',
    usage: 'dxbe deploy [options]',
    options: [
      ['--dry-run', 'Commit in .deploy-git/ but do not push'],
      ['--skip-build', 'Push the existing dist/ without rebuilding'],
    ],
    notes: [
      'Set deploy.repo (and optionally deploy.branch) in site.config.ts first.',
      'Uses your local git credentials; the source repository can stay private.',
    ],
    examples: ['dxbe deploy --dry-run', 'dxbe deploy'],
  },
  check: {
    summary: 'Build, then check links, SEO, every theme, and build the search index',
    usage: 'dxbe check [build options]',
    notes: ['Accepts the same options as `dxbe build`.'],
  },
  index: {
    summary: 'Build the Pagefind search index into dist/pagefind/',
    usage: 'dxbe index',
  },
  clean: {
    summary: 'Remove dist/, caches, and development output',
    usage: 'dxbe clean',
  },
  'check:links': {
    summary: 'Check internal links in dist/',
    usage: 'dxbe check:links',
  },
  'check:seo': {
    summary: 'Check metadata, feeds, and the sitemap in dist/',
    usage: 'dxbe check:seo',
  },
  'check:theme': {
    summary: 'Build every theme against the current content',
    usage: 'dxbe check:theme [theme...]',
    examples: ['dxbe check:theme', 'dxbe check:theme folio apogee'],
  },
  'check:deterministic': {
    summary: 'Build twice and compare the output',
    usage: 'dxbe check:deterministic',
  },
  smoke: {
    summary: 'Smoke-test a deployed site',
    usage: 'BASE_URL=<url> dxbe smoke',
    examples: ['BASE_URL=https://example.com dxbe smoke'],
  },
}

export function isHelpFlag(arg: string): boolean {
  return arg === '--help' || arg === '-h'
}

/** Reads the version from dxbe's own package.json, from src/cli or the bundled dist/. */
export function version(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 4; i += 1) {
    try {
      const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))
      if (pkg.name === 'dxbe' && typeof pkg.version === 'string') return pkg.version
    } catch {}
    dir = path.dirname(dir)
  }
  return 'unknown'
}

function table(rows: Array<[string, string]>): string {
  const width = Math.max(...rows.map(([left]) => left.length))
  return rows.map(([left, right]) => `  ${left.padEnd(width)}  ${right}`).join('\n')
}

export function generalHelp(): string {
  const commands = Object.entries(COMMAND_HELP).map(
    ([name, help]) => [name, help.summary] as [string, string],
  )
  return `dxbe ${version()}

Usage:
  dxbe <command> [options]

Commands:
${table(commands)}

Options:
${table([
  ['-h, --help', 'Show help; `dxbe <command> --help` shows a command'],
  ['-v, --version', 'Print the dxbe version'],
])}

Run \`dxbe help <command>\` for that command's options and examples.
Guide: https://github.com/dx3906999/dxbe/blob/main/docs/tutorial.md`
}

export function commandHelp(name: string): string | undefined {
  const help = COMMAND_HELP[name]
  if (!help) return undefined
  const sections = [`dxbe ${name} — ${help.summary}`, `Usage:\n  ${help.usage}`]
  if (help.options?.length) sections.push(`Options:\n${table(help.options)}`)
  if (help.notes?.length) sections.push(help.notes.join('\n'))
  if (help.examples?.length) {
    sections.push(`Examples:\n${help.examples.map((line) => `  ${line}`).join('\n')}`)
  }
  return sections.join('\n\n')
}
