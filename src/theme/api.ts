import type {
  Alternate,
  ArchiveGroup,
  CategoryView,
  PageItem,
  PageKind,
  Pagination,
  Post,
  TagView,
  TocEntry,
} from '../core/types.ts'
import { html, jsonForScript, raw, type SafeHtml } from '../shared/html.ts'

export type {
  Alternate,
  ArchiveGroup,
  CategoryView,
  PageItem,
  PageKind,
  Pagination,
  Post,
  PostCover,
  Publication,
  PublicationLink,
  TagView,
  TocEntry,
} from '../core/types.ts'
export type { SafeHtml }
export { html, raw }

export type Translator = (key: string, vars?: Record<string, string | number>) => string

export interface NavItemView {
  key: string
  label: string
  url: string
  external: boolean
  current: boolean
}

export interface SiteView {
  title: string
  description: string
  tagline: string
  url: string
  base: string
  lang: string
  label: string
  defaultLang: string
  author: {
    name: string
    email: string
    url: string
    avatar: string
  }
  social: Array<{ label: string; url: string }>
  repository?: { owner: string; name: string }
  license: { code: string; content: string }
  autoLanguage: boolean
  languages: Array<{ code: string; label: string; url: string; current: boolean }>
}

export interface SeoView {
  title: string
  description: string
  canonical: string
  alternates: Alternate[]
  xDefault: string
  ogType: 'website' | 'article'
  image?: string
  robots?: string
  jsonLd: string
  publishedTime?: string
  modifiedTime?: string
  tags?: string[]
}

export interface ThemeAssets {
  themeCss?: string
  themeJs?: string
  katexCss?: string
  searchJs?: string
  searchIndex?: string
}

export interface ThemeHelpers {
  /** Adds the site base to a site path; absolute URLs are returned unchanged. */
  url: (path: string) => string
  absoluteUrl: (path: string) => string
  asset: (path: string) => string
  date: (value: string | Date, style?: 'short' | 'long') => string
  isoDate: (value: string | Date) => string
  t: Translator
  isCurrent: (path: string) => boolean
  postUrl: (post: { url: string }) => string
  pageUrl: (page: { url: string }) => string
  tagUrl: (tag: TagView) => string
  tagUrlByName: (name: string) => string
  categoryUrl: (category: CategoryView) => string
  categoryUrlByName: (name: string) => string
}

/**
 * Section URLs for the current language, base included. `posts` is the post list:
 * the language home in the "posts" home layout, /posts/ in the "profile" layout.
 * `publications` and `search` are set only when those features are on.
 */
export interface RouteView {
  home: string
  posts: string
  archives: string
  tags: string
  categories: string
  search?: string
  publications?: string
}

export interface ThemeContext {
  site: SiteView
  page: {
    kind: PageKind
    title: string
  }
  lang: string
  i18n: {
    lang: string
    label: string
    t: Translator
    alternates: Alternate[]
  }
  nav: NavItemView[]
  routes: RouteView
  seo: SeoView
  assets: ThemeAssets
  theme: unknown
  toc: TocEntry[]
  tocHtml: SafeHtml
  posts?: Post[]
  post?: Post
  pageItem?: PageItem
  tag?: TagView
  tags?: TagView[]
  category?: CategoryView
  categories?: CategoryView[]
  archives?: ArchiveGroup[]
  pagination?: Pagination
  helpers: ThemeHelpers
}

export type LayoutFn = (ctx: ThemeContext) => string | SafeHtml

/**
 * Returns the inline language bootstrap used by the built-in themes. It
 * redirects only from the default-language home page, remembers an explicit
 * language switch, and does nothing when autoLanguage is off.
 */
export function languageBootstrap(ctx: ThemeContext): SafeHtml {
  if (!ctx.site.autoLanguage) return raw('')
  const languages = ctx.site.languages
  if (languages.length < 2) return raw('')

  const targets: Record<string, string> = {}
  for (const language of languages) {
    targets[language.code] = language.url
  }
  const home = ctx.helpers.url('/')
  const currentLang = ctx.i18n.lang
  const isDefaultHome = currentLang === ctx.site.defaultLang ? 'true' : 'false'
  const script = `(() => {
  const key = ${jsonForScript(`dxbe.lang:${ctx.site.base}`)};
  const redirectedKey = ${jsonForScript(`dxbe.lang.redirected:${ctx.site.base}`)};
  const supported = ${jsonForScript(targets)};
  try {
    document.addEventListener('click', (event) => {
      const node = event.target;
      if (!(node instanceof Element)) return;
      const link = node.closest('a[data-language]');
      if (!link) return;
      const code = link.getAttribute('data-language');
      if (code && Object.prototype.hasOwnProperty.call(supported, code)) {
        try { localStorage.setItem(key, code); } catch {}
      }
    });
    let stored = null;
    try { stored = localStorage.getItem(key); } catch {}
    if (stored) {
      if (${isDefaultHome} && stored !== ${jsonForScript(currentLang)} && Object.prototype.hasOwnProperty.call(supported, stored)) {
        location.replace(supported[stored] + location.search + location.hash);
      }
      return;
    }
    let redirected = null;
    try { redirected = sessionStorage.getItem(redirectedKey); } catch {}
    if (redirected) return;
    if (!${isDefaultHome}) return;
    const home = ${jsonForScript(home)};
    const path = location.pathname.replace(new RegExp('/+$'), '') || '/';
    const homePath = home.replace(new RegExp('/+$'), '') || '/';
    if (path !== homePath) return;
    const preferred = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
    for (const value of preferred) {
      const tag = String(value || '').toLowerCase();
      const match = Object.keys(supported).find((code) => tag === code || tag.startsWith(code + '-'));
      if (match) {
        if (match !== ${jsonForScript(currentLang)}) {
          try { sessionStorage.setItem(redirectedKey, '1'); } catch {}
          location.replace(supported[match] + location.search + location.hash);
        }
        return;
      }
    }
  } catch {}
})();`
  return raw(`<script>${script}</script>`)
}

export interface ThemeDefinition {
  config?: { parse: (value: unknown) => unknown }
  layouts: Record<string, LayoutFn>
}

export const themeSymbol = Symbol.for('dxbe.theme')

export interface Theme extends ThemeDefinition {
  readonly [themeSymbol]: true
}

export function defineTheme(theme: ThemeDefinition): Theme {
  return { ...theme, [themeSymbol]: true }
}

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'object' && value !== null && themeSymbol in value
}
