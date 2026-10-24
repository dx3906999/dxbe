import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { formatDate, isoDate as isoDateValue } from '../shared/date.ts'
import { BuildError } from '../shared/errors.ts'
import { html, raw, type SafeHtml, unwrap } from '../shared/html.ts'
import type { Logger } from '../shared/logger.ts'
import {
  archivePath,
  categoriesPath,
  homePath,
  absoluteUrl as makeAbsoluteUrl,
  pagePath,
  postsPath,
  searchPath,
  tagsPath,
  withBase,
} from '../shared/url.ts'
import type {
  NavItemView,
  RouteView,
  SeoView,
  SiteView,
  ThemeAssets,
  ThemeContext,
  Translator,
} from '../theme/api.ts'
import { createTranslator } from '../theme/i18n.ts'
import { copyTaskAssets, type LoadedTheme, resolveLayout } from '../theme/loader.ts'
import type { LoadedConfig } from './config.ts'
import type { RenderTask } from './routes.ts'
import type { ContentSet } from './types.ts'

export interface RenderDeps {
  loaded: LoadedConfig
  content: ContentSet
  theme: LoadedTheme
  assetMap: Map<string, string>
  assets: ThemeAssets
  translators: Map<string, Translator>
  logger: Logger
}

function normalizePath(value: string): string {
  if (value === '/') return value
  return value.replace(/\/+$/, '')
}

function truncate(value: string, max = 160): string {
  const text = value.trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 3).trimEnd()}...`
}

function getTranslator(deps: RenderDeps, lang: string): Translator {
  const cached = deps.translators.get(lang)
  if (cached) return cached
  const translator = createTranslator(
    lang,
    deps.loaded.config.locales.default,
    deps.theme.translations,
    deps.logger,
  )
  deps.translators.set(lang, translator)
  return translator
}

function buildSiteView(loaded: LoadedConfig, lang: string): SiteView {
  const config = loaded.config
  const locale = config.locales.entries[lang]
  if (!locale) throw new BuildError(`Unknown locale "${lang}"`, { code: 'CONFIG' })
  const defaultLang = config.locales.default
  return {
    title: locale.title,
    description: locale.description,
    tagline: locale.tagline,
    url: loaded.url,
    base: loaded.base,
    lang,
    label: locale.label,
    defaultLang,
    author: config.identity.author,
    social: config.identity.social,
    repository: config.identity.repository,
    license: config.site.license,
    autoLanguage: config.features.autoLanguage,
    languages: Object.entries(config.locales.entries).map(([code, entry]) => ({
      code,
      label: entry.label,
      url: withBase(loaded.base, homePath(code, defaultLang)),
      current: code === lang,
    })),
  }
}

function buildNav(
  loaded: LoadedConfig,
  content: ContentSet,
  lang: string,
  currentPath: string,
  t: Translator,
): NavItemView[] {
  const config = loaded.config
  const defaultLang = config.locales.default
  const pages = content.pagesByLang[lang] ?? []
  const items: NavItemView[] = []

  for (const item of config.nav) {
    if (!item.external && !item.path.startsWith('/')) {
      continue
    }
    if (item.path === '/search/' && !config.features.search) continue
    const profile = config.home.layout === 'profile'
    // without a profile home the post list already is the home
    if (item.path === '/posts/' && !profile) continue

    let localizedPath: string
    if (item.external) {
      localizedPath = item.path
    } else if (item.path === '/') {
      localizedPath = homePath(lang, defaultLang)
    } else if (item.path === '/archives/') {
      localizedPath = archivePath(lang, defaultLang)
    } else if (item.path === '/posts/') {
      localizedPath = postsPath(lang, defaultLang)
    } else if (item.path === '/tags/') {
      localizedPath = tagsPath(lang, defaultLang)
    } else if (item.path === '/categories/') {
      localizedPath = categoriesPath(lang, defaultLang)
    } else if (item.path === '/search/') {
      localizedPath = searchPath(lang, defaultLang)
    } else {
      const slug = item.path.replace(/^\/+|\/+$/g, '')
      if (!pages.some((page) => page.slug === slug)) continue
      if (profile && slug === config.home.page) continue
      localizedPath = `/${slug}/`
      localizedPath = withBase('', localizedPath)
      localizedPath = `${lang === defaultLang ? '' : `/${lang}`}${localizedPath}`
    }

    const url = item.external ? localizedPath : withBase(loaded.base, localizedPath)
    const compareCurrent = normalizePath(currentPath)
    const compareNav = normalizePath(localizedPath)
    const current =
      item.path === '/'
        ? compareCurrent === compareNav
        : compareCurrent === compareNav || compareCurrent.startsWith(`${compareNav}/`)

    items.push({
      key: item.key,
      label: t(`nav.${item.key}`),
      url,
      external: item.external,
      current,
    })
  }

  return items
}

function buildRoutes(loaded: LoadedConfig, content: ContentSet, lang: string): RouteView {
  const config = loaded.config
  const defaultLang = config.locales.default
  const at = (pathname: string) => withBase(loaded.base, pathname)
  const hasPublications = (content.pagesByLang[lang] ?? []).some(
    (page) => page.slug === 'publications',
  )
  return {
    home: at(homePath(lang, defaultLang)),
    posts: at(
      config.home.layout === 'profile' ? postsPath(lang, defaultLang) : homePath(lang, defaultLang),
    ),
    archives: at(archivePath(lang, defaultLang)),
    tags: at(tagsPath(lang, defaultLang)),
    categories: at(categoriesPath(lang, defaultLang)),
    search: config.features.search ? at(searchPath(lang, defaultLang)) : undefined,
    publications: hasPublications ? at(pagePath(lang, defaultLang, 'publications')) : undefined,
  }
}

function renderToc(task: RenderTask, t: Translator): SafeHtml {
  const entries = task.toc ?? []
  if (entries.length === 0) return raw('')
  const items = entries.map(
    (entry) =>
      html`<li class="toc-item toc-depth-${entry.depth}"><a href="#${entry.id}">${entry.text}</a></li>`,
  )
  return html`<nav class="toc" aria-label="${t('toc.title')}">
  <p class="toc-title">${t('toc.title')}</p>
  <ol>
    ${items}
  </ol>
</nav>`
}

function buildJsonLd(
  task: RenderTask,
  loaded: LoadedConfig,
  lang: string,
  canonical: string,
  description: string,
): string {
  const config = loaded.config
  const author = {
    '@type': 'Person',
    name: config.identity.author.name,
    url: config.identity.author.url || undefined,
  }
  let data: Record<string, unknown>

  if (task.kind === 'post' && task.post) {
    data = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: task.post.title,
      description,
      datePublished: new Date(task.post.date).toISOString(),
      dateModified: new Date(task.post.updated ?? task.post.date).toISOString(),
      inLanguage: lang,
      author,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      url: canonical,
      keywords: task.post.tags.join(', ') || undefined,
    }
  } else if (task.kind === 'home' && task.pageItem) {
    data = {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: task.pageItem.title,
      description,
      inLanguage: lang,
      url: canonical,
      mainEntity: author,
    }
  } else if ((task.kind === 'page' || task.kind === 'publications') && task.pageItem) {
    data = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: task.pageItem.title,
      description,
      inLanguage: lang,
      author,
      url: canonical,
    }
  } else {
    data = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: config.locales.entries[lang]?.title ?? config.locales.entries[lang]?.label,
      description,
      inLanguage: lang,
      author,
      url: canonical,
    }
  }

  return JSON.stringify(data)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
}

function buildSeo(
  task: RenderTask,
  loaded: LoadedConfig,
  t: Translator,
  pageTitle: string,
  languageAlternates: ThemeContext['i18n']['alternates'],
): SeoView {
  const config = loaded.config
  const locale = config.locales.entries[task.lang]
  if (!locale) throw new BuildError(`Unknown locale "${task.lang}"`, { code: 'CONFIG' })
  const canonical = makeAbsoluteUrl(loaded.url, loaded.base, task.urlPath)
  const description = truncate(
    task.description ??
      (task.descriptionKey ? t(task.descriptionKey) : undefined) ??
      locale.description,
  )
  const siteTitle = locale.title

  let documentTitle: string
  if (task.kind === 'home') {
    documentTitle = siteTitle
  } else if (task.kind === 'index') {
    const listTitle = config.home.layout === 'profile' ? `${pageTitle} · ${siteTitle}` : siteTitle
    documentTitle =
      task.pagination && task.pagination.current > 1
        ? `${listTitle} · ${t('paginator.page', { n: task.pagination.current })}`
        : listTitle
  } else {
    documentTitle = `${pageTitle} · ${siteTitle}`
  }

  const defaultLang = config.locales.default
  const defaultAlternate = languageAlternates.find((alternate) => alternate.lang === defaultLang)
  const publishedTime = task.post ? new Date(task.post.date).toISOString() : undefined
  const modifiedTime = task.post
    ? new Date(task.post.updated ?? task.post.date).toISOString()
    : undefined

  return {
    title: documentTitle,
    description,
    canonical,
    alternates: task.alternates,
    xDefault: defaultAlternate
      ? makeAbsoluteUrl(loaded.url, loaded.base, defaultAlternate.url)
      : canonical,
    ogType: task.kind === 'post' ? 'article' : 'website',
    robots: task.noindex ? 'noindex,follow' : undefined,
    jsonLd: buildJsonLd(task, loaded, task.lang, canonical, description),
    publishedTime,
    modifiedTime,
    tags: task.post?.tags,
  }
}

function fallbackLayout(ctx: ThemeContext): SafeHtml {
  const body =
    ctx.post?.html ??
    ctx.pageItem?.html ??
    (ctx.posts && ctx.posts.length > 0
      ? html`<ul>
          ${ctx.posts.map(
            (post) => html`<li><a href="${ctx.helpers.url(post.url)}">${post.title}</a></li>`,
          )}
        </ul>`
      : raw(`<p>${ctx.seo.description}</p>`))

  return html`<!doctype html>
<html lang="${ctx.i18n.lang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${ctx.seo.title}</title>
    <meta name="description" content="${ctx.seo.description}">
    <link rel="canonical" href="${ctx.seo.canonical}">
  </head>
  <body>
    <main>
      <h1>${ctx.page.title}</h1>
      ${body}
    </main>
  </body>
</html>`
}

function buildContext(
  task: RenderTask,
  deps: RenderDeps,
  t: Translator,
  pageTitle: string,
  seo: SeoView,
  languageAlternates: ThemeContext['i18n']['alternates'],
): ThemeContext {
  const { loaded, content, assetMap } = deps
  const lang = task.lang
  const locale = loaded.config.locales.entries[lang]
  if (!locale) throw new BuildError(`Unknown locale "${lang}"`, { code: 'CONFIG' })
  const site = buildSiteView(loaded, lang)
  const nav = buildNav(loaded, content, lang, task.urlPath, t)
  const hasMath = Boolean(task.post?.hasMath ?? task.pageItem?.hasMath)
  const assets: ThemeAssets = {
    themeCss: deps.assets.themeCss,
    themeJs: deps.assets.themeJs,
    katexCss: hasMath ? deps.assets.katexCss : undefined,
    searchJs: deps.assets.searchJs,
    searchIndex: deps.assets.searchIndex,
  }

  const helpers = {
    url: (pathname: string) => withBase(loaded.base, pathname),
    absoluteUrl: (pathname: string) => makeAbsoluteUrl(loaded.url, loaded.base, pathname),
    asset: (assetPath: string) => {
      const normalized = assetPath.replace(/^\/+/, '')
      const url = assetMap.get(normalized)
      if (!url) {
        throw new BuildError(`Theme asset "${assetPath}" was not found`, {
          code: 'THEME',
          file: `themes/${loaded.config.theme.name}`,
        })
      }
      return url
    },
    date: (value: string | Date, style: 'short' | 'long' = 'long') =>
      formatDate(
        value instanceof Date ? value : new Date(value),
        lang,
        loaded.config.site.timezone,
        style,
      ),
    isoDate: (value: string | Date) =>
      isoDateValue(value instanceof Date ? value : new Date(value), loaded.config.site.timezone),
    t,
    isCurrent: (pathname: string) => normalizePath(pathname) === normalizePath(task.urlPath),
    postUrl: (post: { url: string }) => withBase(loaded.base, post.url),
    pageUrl: (page: { url: string }) => withBase(loaded.base, page.url),
    tagUrl: (tag: { url: string }) => withBase(loaded.base, tag.url),
    tagUrlByName: (name: string) => {
      const tag = (content.tagsByLang[lang] ?? []).find((entry) => entry.name === name)
      return tag ? withBase(loaded.base, tag.url) : '#'
    },
    categoryUrl: (category: { url: string }) => withBase(loaded.base, category.url),
    categoryUrlByName: (name: string) => {
      const category = (content.categoriesByLang[lang] ?? []).find((entry) => entry.name === name)
      return category ? withBase(loaded.base, category.url) : '#'
    },
  }

  return {
    site,
    page: { kind: task.kind, title: pageTitle },
    lang,
    i18n: {
      lang,
      label: locale.label,
      t,
      alternates: languageAlternates,
    },
    nav,
    routes: buildRoutes(loaded, content, lang),
    seo,
    assets,
    theme: deps.theme.config,
    toc: task.toc ?? [],
    tocHtml: renderToc(task, t),
    posts: task.posts,
    post: task.post,
    pageItem: task.pageItem,
    tag: task.tag,
    tags: task.tags,
    category: task.category,
    categories: task.categories,
    archives: task.archives,
    pagination: task.pagination,
    helpers,
  }
}

export async function renderTask(
  task: RenderTask,
  deps: RenderDeps,
  outDir: string,
): Promise<void> {
  const t = getTranslator(deps, task.lang)
  const pageTitle =
    task.title ??
    (task.titleKey
      ? t(task.titleKey, task.titleParams)
      : deps.loaded.config.locales.entries[task.lang]?.title)
  if (!pageTitle) {
    throw new BuildError(`Unable to resolve a title for ${task.urlPath}`, {
      code: 'OUTPUT',
    })
  }

  const homeAlternates = Object.entries(deps.loaded.config.locales.entries).map(
    ([lang, locale]) => ({
      lang,
      label: locale.label,
      url: homePath(lang, deps.loaded.config.locales.default),
      title: locale.title,
    }),
  )
  const languageAlternates = task.alternates.length > 0 ? task.alternates : homeAlternates

  const seo = buildSeo(task, deps.loaded, t, pageTitle, languageAlternates)
  const context = buildContext(task, deps, t, pageTitle, seo, languageAlternates)
  const resolved = resolveLayout(deps.theme.theme, task.kind)
  if (!resolved) {
    deps.logger.warn(
      `theme "${deps.theme.manifest.name}" has no layout for "${task.kind}"; using fallback`,
    )
  } else if (resolved.fallback) {
    deps.logger.warn(
      `theme "${deps.theme.manifest.name}" is missing layout "${task.kind}"; using "${resolved.name}"`,
    )
  }

  const rendered = resolved ? unwrap(resolved.layout(context)) : unwrap(fallbackLayout(context))
  const destination = path.join(outDir, task.outFile)
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, rendered, 'utf8')
  await copyTaskAssets(task, outDir)
}
