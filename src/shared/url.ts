/**
 * Normalize a site base to either "" (site root) or "/subdir" (no trailing
 * slash). Keeping it trailing-slash-free makes every join predictable.
 */
export function normalizeBase(base: string): string {
  const trimmed = (base || '/').trim()
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  const withoutTrailing = withLeading.replace(/\/+$/, '')
  return withoutTrailing === '' ? '' : withoutTrailing
}

export function withBase(base: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (normalizedPath === '/') return base === '' ? '/' : `${base}/`
  return `${base}${normalizedPath}`
}

export function langPrefix(lang: string, defaultLang: string): string {
  return lang === defaultLang ? '' : `/${lang}`
}

export function joinLangPath(lang: string, defaultLang: string, path: string): string {
  const prefix = langPrefix(lang, defaultLang)
  if (path === '/') return `${prefix}/`
  return `${prefix}${path.startsWith('/') ? path : `/${path}`}`
}

export function homePath(lang: string, defaultLang: string): string {
  return joinLangPath(lang, defaultLang, '/')
}

export function postPath(lang: string, defaultLang: string, slug: string): string {
  return joinLangPath(lang, defaultLang, `/posts/${slug}/`)
}

export function pagePath(lang: string, defaultLang: string, slug: string): string {
  return joinLangPath(lang, defaultLang, `/${slug}/`)
}

export function postsPath(lang: string, defaultLang: string): string {
  return joinLangPath(lang, defaultLang, '/posts/')
}

export function tagPath(lang: string, defaultLang: string, tagSlug: string): string {
  return joinLangPath(lang, defaultLang, `/tags/${encodeURIComponent(tagSlug)}/`)
}

export function postsPaginationPath(lang: string, defaultLang: string, page: number): string {
  if (page <= 1) return postsPath(lang, defaultLang)
  return joinLangPath(lang, defaultLang, `/posts/page/${page}/`)
}

export function categoryPath(lang: string, defaultLang: string, slug: string): string {
  return joinLangPath(lang, defaultLang, `/categories/${encodeURIComponent(slug)}/`)
}

export function categoriesPath(lang: string, defaultLang: string): string {
  return joinLangPath(lang, defaultLang, '/categories/')
}

export function categoryPaginationPath(
  lang: string,
  defaultLang: string,
  slug: string,
  page: number,
): string {
  if (page <= 1) return categoryPath(lang, defaultLang, slug)
  return joinLangPath(lang, defaultLang, `/categories/${encodeURIComponent(slug)}/page/${page}/`)
}

export function tagsPath(lang: string, defaultLang: string): string {
  return joinLangPath(lang, defaultLang, '/tags/')
}

export function archivePath(lang: string, defaultLang: string, year?: number | string): string {
  return joinLangPath(lang, defaultLang, year ? `/archives/${year}/` : '/archives/')
}

export function searchPath(lang: string, defaultLang: string): string {
  return joinLangPath(lang, defaultLang, '/search/')
}

export function paginationPath(lang: string, defaultLang: string, page: number): string {
  if (page <= 1) return homePath(lang, defaultLang)
  return joinLangPath(lang, defaultLang, `/page/${page}/`)
}

export function tagPaginationPath(
  lang: string,
  defaultLang: string,
  tagSlug: string,
  page: number,
): string {
  if (page <= 1) return tagPath(lang, defaultLang, tagSlug)
  return joinLangPath(lang, defaultLang, `/tags/${encodeURIComponent(tagSlug)}/page/${page}/`)
}

export function absoluteUrl(origin: string, base: string, path: string): string {
  return new URL(withBase(base, path), origin).toString()
}

export function normalizeSiteUrl(url: string): string {
  const parsed = new URL(url)
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new Error('site.url must be an origin without a path; use site.base for subpaths')
  }
  return parsed.origin
}

export function stripBase(pathname: string, base: string): string {
  if (base === '') return pathname
  if (pathname === base) return '/'
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length)
  return pathname
}

export function decodePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname
  }
}

export function isExternal(href: string): boolean {
  return (
    /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href) || /^(?:mailto|tel|data|javascript):/i.test(href)
  )
}

export function withTrailingSlash(path: string): string {
  if (path.endsWith('/')) return path
  return `${path}/`
}
