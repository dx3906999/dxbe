import { isoDate } from '../shared/date.ts'
import {
  archivePath,
  categoriesPath,
  categoryPaginationPath,
  homePath,
  paginationPath,
  postsPaginationPath,
  searchPath,
  stripBase,
  tagPaginationPath,
  tagsPath,
} from '../shared/url.ts'
import type { LoadedConfig } from './config.ts'
import type {
  Alternate,
  ArchiveGroup,
  CategoryView,
  ContentSet,
  PageItem,
  PageKind,
  Pagination,
  Post,
  TagView,
  TocEntry,
} from './types.ts'

export interface RenderTask {
  kind: PageKind
  lang: string
  urlPath: string
  outFile: string
  title?: string
  titleKey?: string
  titleParams?: Record<string, string | number>
  description?: string
  descriptionKey?: string
  posts?: Post[]
  post?: Post
  pageItem?: PageItem
  tag?: TagView
  tags?: TagView[]
  category?: CategoryView
  categories?: CategoryView[]
  archives?: ArchiveGroup[]
  pagination?: Pagination
  toc?: TocEntry[]
  alternates: Alternate[]
  lastmod?: string
  noindex?: boolean
}

export function outFileForUrl(urlPath: string, base: string): string {
  const relative = stripBase(urlPath, base).replace(/^\/+/, '')
  let decoded = relative
  try {
    decoded = decodeURIComponent(relative)
  } catch {
    // Keep the original path if it is not valid percent-encoding.
  }
  if (!decoded) return 'index.html'
  if (urlPath.endsWith('/')) return `${decoded}index.html`
  return decoded
}

function sectionAlternates(
  languages: string[],
  loaded: LoadedConfig,
  urlFor: (lang: string) => string,
  titleFor: (lang: string) => string,
): Alternate[] {
  return languages.map((lang) => ({
    lang,
    label: loaded.config.locales.entries[lang]?.label ?? lang,
    url: urlFor(lang),
    title: titleFor(lang),
  }))
}

function buildPagination(
  current: number,
  total: number,
  urlFor: (page: number) => string,
): Pagination {
  return {
    current,
    total,
    prevUrl: current > 1 ? urlFor(current - 1) : undefined,
    nextUrl: current < total ? urlFor(current + 1) : undefined,
    pages: Array.from({ length: total }, (_, index) => ({
      n: index + 1,
      url: urlFor(index + 1),
    })),
  }
}

/** Same-named tag or category in each language, else that language's index of them. */
function taxonomyAlternates(
  name: string,
  byLang: Record<string, TagView[]>,
  indexPath: (lang: string) => string,
  loaded: LoadedConfig,
  languages: string[],
): Alternate[] {
  return languages.map((lang) => {
    const item = byLang[lang]?.find((entry) => entry.name === name)
    return {
      lang,
      label: loaded.config.locales.entries[lang]?.label ?? lang,
      url: item ? item.url : indexPath(lang),
      title: item?.name ?? loaded.config.locales.entries[lang]?.title ?? lang,
    }
  })
}

function archiveAlternates(
  year: number | undefined,
  loaded: LoadedConfig,
  content: ContentSet,
  languages: string[],
): Alternate[] {
  const defaultLang = loaded.config.locales.default
  return languages.map((lang) => {
    const hasYear =
      year === undefined ||
      (content.archivesByLang[lang] ?? []).some((group) => group.year === year)
    return {
      lang,
      label: loaded.config.locales.entries[lang]?.label ?? lang,
      url: hasYear ? archivePath(lang, defaultLang, year) : archivePath(lang, defaultLang),
      title: year ? String(year) : (loaded.config.locales.entries[lang]?.title ?? lang),
    }
  })
}

export function buildTasks(loaded: LoadedConfig, content: ContentSet): RenderTask[] {
  const config = loaded.config
  const defaultLang = config.locales.default
  const languages = Object.keys(config.locales.entries)
  const perPage = config.pagination.perPage
  const timezone = config.site.timezone
  const tasks: RenderTask[] = []

  for (const lang of languages) {
    const locale = config.locales.entries[lang]
    if (!locale) continue
    const posts = content.postsByLang[lang] ?? []
    const pages = content.pagesByLang[lang] ?? []
    const tags = content.tagsByLang[lang] ?? []
    const categories = content.categoriesByLang[lang] ?? []
    const archives = content.archivesByLang[lang] ?? []
    const profile = config.home.layout === 'profile'
    const homePage = profile ? pages.find((page) => page.slug === config.home.page) : undefined

    const homeAlternates = sectionAlternates(
      languages,
      loaded,
      (code) => homePath(code, defaultLang),
      (code) => config.locales.entries[code]?.title ?? code,
    )
    if (homePage) {
      const urlPath = homePath(lang, defaultLang)
      tasks.push({
        kind: 'home',
        lang,
        urlPath,
        outFile: outFileForUrl(urlPath, loaded.base),
        title: homePage.title,
        description: homePage.summary || locale.description,
        pageItem: homePage,
        toc: homePage.toc,
        // the newest posts, for themes that show them next to the introduction
        posts: posts.slice(0, perPage),
        alternates: homeAlternates,
        lastmod: posts[0] ? isoDate(new Date(posts[0].timestamp), timezone) : undefined,
      })
    }

    const listPath = (code: string, n: number) =>
      profile ? postsPaginationPath(code, defaultLang, n) : paginationPath(code, defaultLang, n)
    const listAlternates = profile
      ? sectionAlternates(
          languages,
          loaded,
          (code) => listPath(code, 1),
          (code) => config.locales.entries[code]?.title ?? code,
        )
      : homeAlternates
    const listTotal = Math.max(1, Math.ceil(posts.length / perPage))
    for (let page = 1; page <= listTotal; page += 1) {
      const pagePosts = posts.slice((page - 1) * perPage, page * perPage)
      const urlPath = listPath(lang, page)
      tasks.push({
        kind: 'index',
        lang,
        urlPath,
        outFile: outFileForUrl(urlPath, loaded.base),
        ...(profile ? { titleKey: 'page.posts' } : { title: locale.title }),
        description: locale.description,
        posts: pagePosts,
        pagination: buildPagination(page, listTotal, (n) => listPath(lang, n)),
        alternates: page === 1 ? listAlternates : [],
        lastmod: pagePosts[0] ? isoDate(new Date(pagePosts[0].timestamp), timezone) : undefined,
        noindex: page > 1,
      })
    }

    for (const post of posts) {
      tasks.push({
        kind: 'post',
        lang,
        urlPath: post.url,
        outFile: outFileForUrl(post.url, loaded.base),
        title: post.title,
        description: post.summary,
        post,
        toc: post.toc,
        alternates: post.alternates,
        lastmod: isoDate(new Date(post.timestamp), timezone),
      })
    }

    const tagsIndexUrl = tagsPath(lang, defaultLang)
    tasks.push({
      kind: 'tags',
      lang,
      urlPath: tagsIndexUrl,
      outFile: outFileForUrl(tagsIndexUrl, loaded.base),
      titleKey: 'page.tags',
      description: locale.description,
      tags,
      alternates: sectionAlternates(
        languages,
        loaded,
        (code) => tagsPath(code, defaultLang),
        (code) => config.locales.entries[code]?.title ?? code,
      ),
    })

    for (const tag of tags) {
      const tagPosts = posts.filter((post) => post.tags.includes(tag.name))
      const alternates = taxonomyAlternates(
        tag.name,
        content.tagsByLang,
        (code) => tagsPath(code, defaultLang),
        loaded,
        languages,
      )
      const total = Math.max(1, Math.ceil(tagPosts.length / perPage))
      for (let page = 1; page <= total; page += 1) {
        const urlPath = tagPaginationPath(lang, defaultLang, tag.slug, page)
        const pagePosts = tagPosts.slice((page - 1) * perPage, page * perPage)
        tasks.push({
          kind: 'tag',
          lang,
          urlPath,
          outFile: outFileForUrl(urlPath, loaded.base),
          title: tag.name,
          description: locale.description,
          tag,
          posts: pagePosts,
          pagination: buildPagination(page, total, (n) =>
            tagPaginationPath(lang, defaultLang, tag.slug, n),
          ),
          alternates: page === 1 ? alternates : [],
          lastmod: pagePosts[0] ? isoDate(new Date(pagePosts[0].timestamp), timezone) : undefined,
          noindex: page > 1,
        })
      }
    }

    const categoriesIndexUrl = categoriesPath(lang, defaultLang)
    tasks.push({
      kind: 'categories',
      lang,
      urlPath: categoriesIndexUrl,
      outFile: outFileForUrl(categoriesIndexUrl, loaded.base),
      titleKey: 'page.categories',
      description: locale.description,
      categories,
      tags: categories,
      alternates: sectionAlternates(
        languages,
        loaded,
        (code) => categoriesPath(code, defaultLang),
        (code) => config.locales.entries[code]?.title ?? code,
      ),
    })

    for (const category of categories) {
      const categoryPosts = posts.filter((post) => post.categories.includes(category.name))
      const alternates = taxonomyAlternates(
        category.name,
        content.categoriesByLang,
        (code) => categoriesPath(code, defaultLang),
        loaded,
        languages,
      )
      const total = Math.max(1, Math.ceil(categoryPosts.length / perPage))
      for (let page = 1; page <= total; page += 1) {
        const urlPath = categoryPaginationPath(lang, defaultLang, category.slug, page)
        const pagePosts = categoryPosts.slice((page - 1) * perPage, page * perPage)
        tasks.push({
          kind: 'category',
          lang,
          urlPath,
          outFile: outFileForUrl(urlPath, loaded.base),
          title: category.name,
          description: locale.description,
          category,
          tag: category,
          posts: pagePosts,
          pagination: buildPagination(page, total, (n) =>
            categoryPaginationPath(lang, defaultLang, category.slug, n),
          ),
          alternates: page === 1 ? alternates : [],
          lastmod: pagePosts[0] ? isoDate(new Date(pagePosts[0].timestamp), timezone) : undefined,
          noindex: page > 1,
        })
      }
    }

    const archiveUrl = archivePath(lang, defaultLang)
    tasks.push({
      kind: 'archive',
      lang,
      urlPath: archiveUrl,
      outFile: outFileForUrl(archiveUrl, loaded.base),
      titleKey: 'page.archives',
      description: locale.description,
      archives,
      alternates: archiveAlternates(undefined, loaded, content, languages),
      lastmod: posts[0] ? isoDate(new Date(posts[0].timestamp), timezone) : undefined,
    })

    for (const group of archives) {
      const urlPath = archivePath(lang, defaultLang, group.year)
      tasks.push({
        kind: 'archive',
        lang,
        urlPath,
        outFile: outFileForUrl(urlPath, loaded.base),
        title: String(group.year),
        description: locale.description,
        archives: [group],
        posts: group.posts,
        alternates: archiveAlternates(group.year, loaded, content, languages),
        lastmod: group.posts[0] ? isoDate(new Date(group.posts[0].timestamp), timezone) : undefined,
      })
    }

    if (config.features.search) {
      const urlPath = searchPath(lang, defaultLang)
      tasks.push({
        kind: 'search',
        lang,
        urlPath,
        outFile: outFileForUrl(urlPath, loaded.base),
        titleKey: 'page.search',
        description: locale.description,
        alternates: sectionAlternates(
          languages,
          loaded,
          (code) => searchPath(code, defaultLang),
          (code) => config.locales.entries[code]?.title ?? code,
        ),
        noindex: true,
      })
    }

    for (const page of pages) {
      // the profile page is published as the language home, not at its own slug
      if (page === homePage) continue
      tasks.push({
        kind: page.slug === 'publications' ? 'publications' : 'page',
        lang,
        urlPath: page.url,
        outFile: outFileForUrl(page.url, loaded.base),
        title: page.title,
        description: page.summary,
        pageItem: page,
        toc: page.toc,
        alternates: page.alternates,
      })
    }
  }

  const defaultLocale = config.locales.entries[defaultLang]
  if (defaultLocale) {
    tasks.push({
      kind: 'notFound',
      lang: defaultLang,
      urlPath: '/404.html',
      outFile: '404.html',
      titleKey: 'page.notFound',
      description: defaultLocale.description,
      alternates: [],
      noindex: true,
    })
  }

  return tasks
}
