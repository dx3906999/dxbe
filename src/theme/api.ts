import type {
  Alternate,
  ArchiveGroup,
  PageItem,
  PageKind,
  Pagination,
  Post,
  TagView,
  TocEntry,
} from '../core/types.ts'
import { html, raw, type SafeHtml } from '../shared/html.ts'

export type {
  Alternate,
  ArchiveGroup,
  PageItem,
  PageKind,
  Pagination,
  Post,
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
  archives?: ArchiveGroup[]
  pagination?: Pagination
  helpers: ThemeHelpers
}

export type LayoutFn = (ctx: ThemeContext) => string | SafeHtml

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
