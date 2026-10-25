import { absoluteUrl, homePath, withBase } from '../shared/url.ts'
import type { LoadedConfig } from './config.ts'
import type { RenderTask } from './routes.ts'
import type { Post } from './types.ts'

export function atomPath(lang: string, defaultLang: string): string {
  return lang === defaultLang ? '/atom.xml' : `/${lang}/atom.xml`
}

export function atomFile(lang: string, defaultLang: string): string {
  return lang === defaultLang ? 'atom.xml' : `${lang}/atom.xml`
}

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function xmlDate(post: Post): string {
  return new Date(post.updated ?? post.date).toISOString()
}

export function renderAtom(loaded: LoadedConfig, lang: string, posts: Post[]): string {
  const locale = loaded.config.locales.entries[lang]
  if (!locale) throw new Error(`Unknown locale ${lang}`)
  const defaultLang = loaded.config.locales.default
  const feedUrl = absoluteUrl(loaded.url, loaded.base, atomPath(lang, defaultLang))
  const homeUrl = absoluteUrl(loaded.url, loaded.base, homePath(lang, defaultLang))
  const updated = posts[0] ? xmlDate(posts[0]) : '1970-01-01T00:00:00.000Z'
  const author = loaded.config.identity.author
  const authorEmail = author.email ? `\n      <email>${escapeXml(author.email)}</email>` : ''

  const entries = posts
    .map((post) => {
      const url = absoluteUrl(loaded.url, loaded.base, post.url)
      const published = new Date(post.date).toISOString()
      const modified = xmlDate(post)
      const categories = post.tags
        .map((tag) => `\n      <category term="${escapeXml(tag)}"/>`)
        .join('')
      // ciphertext is useless in a reader; the entry links to the unlock page instead
      const content = post.encrypted
        ? ''
        : `\n      <content type="html" xml:base="${escapeXml(url)}">${escapeXml(post.html.value)}</content>`
      return `    <entry>
      <title type="text">${escapeXml(post.title)}</title>
      <link rel="alternate" type="text/html" href="${escapeXml(url)}"/>
      <id>${escapeXml(url)}</id>
      <published>${published}</published>
      <updated>${modified}</updated>
      <summary type="text">${escapeXml(post.summary)}</summary>${content}${categories}
    </entry>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${escapeXml(lang)}">
  <title type="text">${escapeXml(locale.title)}</title>
  <subtitle type="text">${escapeXml(locale.description)}</subtitle>
  <link rel="alternate" type="text/html" href="${escapeXml(homeUrl)}"/>
  <link rel="self" type="application/atom+xml" href="${escapeXml(feedUrl)}"/>
  <id>${escapeXml(feedUrl)}</id>
  <updated>${updated}</updated>
  <generator>dxbe</generator>
  <author>
    <name>${escapeXml(author.name)}</name>${authorEmail}
  </author>
  <rights>${escapeXml(loaded.config.site.license.content)}</rights>
${entries}
</feed>
`
}

export function renderSitemap(loaded: LoadedConfig, tasks: RenderTask[]): string {
  const defaultLang = loaded.config.locales.default
  const included = tasks
    .filter((task) => task.kind !== 'notFound' && task.kind !== 'search' && !task.noindex)
    .sort((a, b) => (a.urlPath < b.urlPath ? -1 : a.urlPath > b.urlPath ? 1 : 0))

  const urls = included
    .map((task) => {
      const loc = absoluteUrl(loaded.url, loaded.base, task.urlPath)
      const lastmod = task.lastmod ? `\n    <lastmod>${task.lastmod}</lastmod>` : ''
      let alternates = ''
      if (task.alternates.length > 0) {
        alternates = task.alternates
          .map(
            (alternate) =>
              `\n    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.lang)}" href="${escapeXml(
                absoluteUrl(loaded.url, loaded.base, alternate.url),
              )}"/>`,
          )
          .join('')
        const fallback = task.alternates.find((alternate) => alternate.lang === defaultLang)
        if (fallback) {
          alternates += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(
            absoluteUrl(loaded.url, loaded.base, fallback.url),
          )}"/>`
        }
      }
      return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod}${alternates}
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`
}

export function renderRobots(loaded: LoadedConfig): string {
  const sitemap = absoluteUrl(loaded.url, loaded.base, '/sitemap.xml')
  return `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`
}

export function renderManifest(
  loaded: LoadedConfig,
  tasks: RenderTask[],
  counts: { posts: number; pages: number },
): string {
  return `${JSON.stringify(
    {
      base: loaded.base,
      url: loaded.url,
      defaultLang: loaded.config.locales.default,
      languages: Object.keys(loaded.config.locales.entries),
      theme: loaded.config.theme.name,
      posts: counts.posts,
      pages: counts.pages,
      routes: tasks.map((task) => task.urlPath).sort(),
    },
    null,
    2,
  )}\n`
}

export function sitemapFile(): string {
  return 'sitemap.xml'
}

export function outputUrl(pathname: string, base: string): string {
  return withBase(base, pathname)
}
