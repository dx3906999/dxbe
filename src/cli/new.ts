import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { stringify as stringifyYaml } from 'yaml'
import { loadConfig } from '../core/config.ts'
import { parseArgs } from './args.ts'

function zonedIso(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'longOffset',
  }).formatToParts(date)
  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? ''
  const offset = get('timeZoneName').replace('GMT', '') || '+00:00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}${offset}`
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
}

export async function runNew(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv)
  const title = args.positionals.join(' ').trim()
  if (!title) {
    throw new Error('Usage: dxbe new "Post title" --slug hello-world --lang zh')
  }

  const loaded = await loadConfig({ root: process.cwd(), production: false })
  const lang = args.options.get('--lang') ?? loaded.config.locales.default
  if (!loaded.config.locales.entries[lang]) {
    throw new Error(`Unknown language "${lang}"`)
  }

  const slug = args.options.get('--slug') ?? slugify(title)
  if (!slug) {
    throw new Error('Chinese titles need an explicit --slug, for example --slug hello-world')
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Slug must be lowercase ASCII letters, digits, and single hyphens')
  }

  const date = args.options.get('--date') ?? zonedIso(new Date(), loaded.config.site.timezone)
  const tags = (args.options.get('--tags') ?? '')
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
  const draft = args.flags.has('--draft')
  const translationKey = args.options.get('--translation-key') ?? slug

  const dir = path.join(process.cwd(), 'content', lang, 'posts', slug)
  try {
    await access(dir)
    throw new Error(`Post already exists: content/${lang}/posts/${slug}/`)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Post already exists')) throw error
  }

  await mkdir(dir, { recursive: true })
  const frontmatter = stringifyYaml({
    title,
    date,
    tags,
    slug,
    translationKey,
    ...(draft ? { draft: true } : {}),
  }).trimEnd()
  const placeholder =
    lang === 'zh'
      ? '在这里写第一段。删掉这行占位文字。'
      : 'Start with the first paragraph. Delete this placeholder.'
  const body = `---\n${frontmatter}\n---\n\n${placeholder}\n`
  await writeFile(path.join(dir, 'index.md'), body, 'utf8')
  console.log(`created content/${lang}/posts/${slug}/index.md`)
}
