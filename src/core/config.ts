import { access } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { z } from 'zod'
import { BuildError } from '../shared/errors.ts'
import { normalizeBase, normalizeSiteUrl } from '../shared/url.ts'

const timezoneSchema = z.string().refine(
  (value) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value }).format(new Date())
      return true
    } catch {
      return false
    }
  },
  { message: 'must be a valid IANA timezone' },
)

const authorSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().default(''),
    url: z.string().default(''),
    avatar: z.string().default(''),
  })
  .strict()

const socialSchema = z
  .object({
    label: z.string().min(1),
    url: z.string().min(1),
  })
  .strict()

const repositorySchema = z
  .object({
    owner: z.string().min(1),
    name: z.string().min(1),
  })
  .strict()

const localeEntrySchema = z
  .object({
    label: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    tagline: z.string().default(''),
  })
  .strict()

const licenseSchema = z
  .object({
    code: z.string().min(1),
    content: z.string().min(1),
  })
  .strict()

const navItemSchema = z
  .object({
    key: z.string().min(1),
    path: z.string().startsWith('/'),
    external: z.boolean().default(false),
  })
  .strict()

const siteMetaSchema = z
  .object({
    url: z.string().min(1),
    base: z
      .string()
      .default('/')
      .refine((value) => value.startsWith('/') && !value.includes(':') && !value.includes('\\'), {
        message: 'base must be a URL path such as / or /repo/',
      }),
    customDomain: z.string().min(1).optional(),
    timezone: timezoneSchema.default('Asia/Shanghai'),
    license: licenseSchema.default({ code: 'MIT', content: 'CC BY-NC-SA 4.0' }),
  })
  .strict()

const featuresSchema = z
  .object({
    search: z.boolean().default(true),
    math: z.boolean().default(true),
    autoLanguage: z.boolean().default(true),
  })
  .strict()
  .default({ search: true, math: true, autoLanguage: true })

const paginationSchema = z
  .object({
    perPage: z.number().int().positive().default(10),
  })
  .strict()
  .default({ perPage: 10 })

const markdownSchema = z
  .object({
    allowHtml: z.boolean().default(false),
    shiki: z
      .object({
        light: z.string().default('github-light'),
        dark: z.string().default('github-dark'),
      })
      .strict()
      .default({ light: 'github-light', dark: 'github-dark' }),
  })
  .strict()
  .default({ allowHtml: false, shiki: { light: 'github-light', dark: 'github-dark' } })

export const siteConfigSchema = z
  .object({
    identity: z
      .object({
        author: authorSchema,
        social: z.array(socialSchema).default([]),
        repository: repositorySchema.optional(),
      })
      .strict(),
    locales: z
      .object({
        default: z.string().min(1),
        entries: z.record(z.string(), localeEntrySchema),
      })
      .strict(),
    site: siteMetaSchema,
    theme: z
      .object({
        name: z.string().min(1),
        config: z.record(z.string(), z.unknown()).default({}),
      })
      .strict(),
    nav: z.array(navItemSchema).default([
      { key: 'home', path: '/', external: false },
      { key: 'archives', path: '/archives/', external: false },
      { key: 'tags', path: '/tags/', external: false },
      { key: 'about', path: '/about/', external: false },
    ]),
    pagination: paginationSchema,
    features: featuresSchema,
    markdown: markdownSchema,
  })
  .strict()

export type SiteConfig = z.output<typeof siteConfigSchema>
export type SiteConfigInput = z.input<typeof siteConfigSchema>

export interface LoadConfigOptions {
  root: string
  base?: string
  theme?: string
  production?: boolean
}

export interface LoadedConfig {
  root: string
  config: SiteConfig
  base: string
  url: string
}

export function defineConfig(config: SiteConfigInput): SiteConfigInput {
  return config
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const pathText = issue.path.length > 0 ? issue.path.join('.') : '(root)'
      return `${pathText}: ${issue.message}`
    })
    .join('\n')
}

function isPlaceholderHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'example.com' ||
    hostname.endsWith('.example.com')
  )
}

export async function loadConfig(options: LoadConfigOptions): Promise<LoadedConfig> {
  const configPath = path.join(options.root, 'site.config.ts')
  try {
    await access(configPath)
  } catch {
    throw new BuildError('site.config.ts not found', {
      code: 'CONFIG',
      file: 'site.config.ts',
      hint: 'run "npm run setup" or copy site.config.example.ts',
    })
  }

  let imported: { default?: unknown }
  try {
    imported = (await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`)) as {
      default?: unknown
    }
  } catch (error) {
    throw new BuildError('Failed to import site.config.ts', {
      code: 'CONFIG',
      file: 'site.config.ts',
      cause: error,
    })
  }

  if (imported.default === undefined) {
    throw new BuildError('site.config.ts must have a default export', {
      code: 'CONFIG',
      file: 'site.config.ts',
      hint: 'use defineConfig({ ... })',
    })
  }

  const raw = structuredClone(imported.default) as SiteConfigInput & {
    site: SiteConfigInput['site'] & { base: string; url: string }
  }

  if (process.env.SITE_URL) raw.site.url = process.env.SITE_URL
  if (options.base) raw.site.base = options.base
  else if (process.env.SITE_BASE) raw.site.base = process.env.SITE_BASE
  if (options.theme) raw.theme = { ...raw.theme, name: options.theme }

  if (raw.site.customDomain) {
    const domain = raw.site.customDomain
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
    raw.site.customDomain = domain
    // A configured custom domain is the production origin unless CI provides
    // SITE_URL explicitly (for example from actions/configure-pages).
    if (!process.env.SITE_URL) raw.site.url = `https://${domain}`
  }

  const parsed = siteConfigSchema.safeParse(raw)
  if (!parsed.success) {
    throw new BuildError(`site.config.ts is invalid\n${formatZodError(parsed.error)}`, {
      code: 'CONFIG',
      file: 'site.config.ts',
      hint: 'compare with site.config.example.ts',
    })
  }

  const config = parsed.data
  if (!config.locales.entries[config.locales.default]) {
    throw new BuildError(`locales.default "${config.locales.default}" has no entry`, {
      code: 'CONFIG',
      file: 'site.config.ts',
      hint: 'add it under locales.entries',
    })
  }

  let base: string
  let url: string
  try {
    base = normalizeBase(config.site.base)
    url = normalizeSiteUrl(config.site.url)
  } catch (error) {
    throw new BuildError((error as Error).message, {
      code: 'CONFIG',
      file: 'site.config.ts',
      hint: 'site.url must be an origin; use site.base for subpaths',
    })
  }

  config.site.base = base === '' ? '/' : `${base}/`
  config.site.url = url

  if (options.production) {
    const host = new URL(url).hostname
    if (isPlaceholderHost(host) && process.env.SITE_ALLOW_PLACEHOLDER !== '1') {
      throw new BuildError(`Refusing to build production metadata for placeholder host "${host}"`, {
        code: 'CONFIG',
        file: 'site.config.ts',
        hint: 'set SITE_URL or site.url to the real domain',
      })
    }
  }

  return { root: options.root, config, base, url }
}
