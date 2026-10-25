import type { SafeHtml } from '../shared/html.ts'

export type PageKind =
  | 'index'
  | 'home'
  | 'post'
  | 'page'
  | 'publications'
  | 'archive'
  | 'tag'
  | 'tags'
  | 'category'
  | 'categories'
  | 'search'
  | 'notFound'

export interface TocEntry {
  depth: number
  id: string
  text: string
}

export interface Alternate {
  lang: string
  label: string
  url: string
  title: string
}

export interface PostRef {
  title: string
  url: string
}

export interface Post {
  lang: string
  slug: string
  translationKey: string
  title: string
  date: string
  timestamp: number
  updated?: string
  tags: string[]
  categories: string[]
  summary: string
  draft: boolean
  /** The body is ciphertext behind a password form; themes may mark it in lists. */
  encrypted: boolean
  url: string
  html: SafeHtml
  toc: TocEntry[]
  hasMath: boolean
  readingMinutes: number
  alternates: Alternate[]
  prev?: PostRef
  next?: PostRef
  sourceFile: string
  sourceDir: string
  assetFiles: string[]
}

export interface PageItem {
  lang: string
  slug: string
  translationKey: string
  title: string
  summary: string
  draft: boolean
  url: string
  html: SafeHtml
  toc: TocEntry[]
  hasMath: boolean
  alternates: Alternate[]
  sourceFile: string
  sourceDir: string
  assetFiles: string[]
  /** Structured entries from the publications page frontmatter. */
  publications?: Publication[]
}

export interface PublicationLink {
  label: string
  url: string
}

export interface Publication {
  title: string
  authors: string[]
  venue?: string
  year?: string
  type?: string
  note?: string
  links: PublicationLink[]
}

export interface TagView {
  name: string
  slug: string
  url: string
  count: number
}

/** Categories share the tag shape: name, slug, url, count. */
export type CategoryView = TagView

export interface ArchiveGroup {
  year: number
  posts: Post[]
}

export interface PageLink {
  n: number
  url: string
}

export interface Pagination {
  current: number
  total: number
  prevUrl?: string
  nextUrl?: string
  pages: PageLink[]
}

export interface ContentSet {
  postsByLang: Record<string, Post[]>
  pagesByLang: Record<string, PageItem[]>
  tagsByLang: Record<string, TagView[]>
  categoriesByLang: Record<string, CategoryView[]>
  archivesByLang: Record<string, ArchiveGroup[]>
  warnings: string[]
}
