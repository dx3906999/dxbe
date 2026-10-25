import { html, type Post, type TagView, type ThemeContext } from '../../../src/theme/api.ts'
import { getScholarConfig } from '../config.ts'

export function tagLinks(ctx: ThemeContext, tags: string[]) {
  if (tags.length === 0) return html``
  return html`<span class="scholar-keywords" aria-label="${ctx.i18n.t('post.tags')}">
    ${tags.map(
      (tag, index) =>
        html`${index > 0 ? ', ' : ''}<a href="${ctx.helpers.tagUrlByName(tag)}">${tag}</a>`,
    )}
  </span>`
}

export function byline(ctx: ThemeContext, post: Post) {
  const config = getScholarConfig(ctx)
  return html`<p class="scholar-byline">
    ${ctx.site.author.name}
    <span aria-hidden="true"> · </span>
    <time datetime="${post.date}">${ctx.helpers.date(post.date)}</time>
    ${
      config.showReadingTime
        ? html`<span aria-hidden="true"> · </span>${post.readingMinutes} ${ctx.i18n.t('post.minutes')}`
        : ''
    }
  </p>`
}

export function articleList(
  ctx: ThemeContext,
  posts: Post[],
  options: { abstract?: boolean } = {},
) {
  if (posts.length === 0) return html`<p class="empty">${ctx.i18n.t('post.empty')}</p>`
  const showAbstract = options.abstract ?? true
  return html`<ol class="article-list">
    ${posts.map((post) => {
      // compact lists (no abstract) skip the cover too
      const cover = showAbstract ? post.cover : undefined
      return html`<li class="article-item${cover ? ' has-cover' : ''}">
        <div class="article-number" aria-hidden="true"></div>
        <div class="article-main">
          <h2><a href="${ctx.helpers.postUrl(post)}">${post.title}</a></h2>
          ${byline(ctx, post)}
          ${showAbstract ? html`<p class="article-abstract">${post.summary}</p>` : ''}
          ${
            post.tags.length > 0
              ? html`<p class="article-keywords">${ctx.i18n.t('page.keywords')}: ${tagLinks(ctx, post.tags)}</p>`
              : ''
          }
        </div>
        ${
          cover
            ? html`<a class="article-thumb" href="${ctx.helpers.postUrl(post)}" tabindex="-1" aria-hidden="true"><img src="${ctx.helpers.url(cover.url)}" alt="" loading="lazy" decoding="async"></a>`
            : ''
        }
      </li>`
    })}
  </ol>`
}

/** The cover as the article's lead figure; empty when the post has none. */
export function postCover(ctx: ThemeContext, post: Post) {
  if (!post.cover) return html``
  return html`<figure class="scholar-cover">
    <img src="${ctx.helpers.url(post.cover.url)}" alt="${post.cover.alt}" decoding="async">
  </figure>`
}

export function pagination(ctx: ThemeContext) {
  const pagination = ctx.pagination
  if (!pagination || pagination.total <= 1) return html``
  return html`<nav class="scholar-pagination" aria-label="${ctx.i18n.t('paginator.label')}">
    ${
      pagination.prevUrl
        ? html`<a rel="prev" href="${ctx.helpers.url(pagination.prevUrl)}">${ctx.i18n.t('paginator.prev')}</a>`
        : html`<span></span>`
    }
    <span>${pagination.current} / ${pagination.total}</span>
    ${
      pagination.nextUrl
        ? html`<a rel="next" href="${ctx.helpers.url(pagination.nextUrl)}">${ctx.i18n.t('paginator.next')}</a>`
        : html`<span></span>`
    }
  </nav>`
}

export function prevNext(ctx: ThemeContext) {
  const post = ctx.post
  if (!post) return html``
  return html`<nav class="scholar-prev-next" aria-label="${ctx.i18n.t('paginator.label')}">
    ${
      post.prev
        ? html`<a rel="prev" href="${ctx.helpers.postUrl(post.prev)}"><span>${ctx.i18n.t('post.prev')}</span>${post.prev.title}</a>`
        : html`<span></span>`
    }
    ${
      post.next
        ? html`<a rel="next" href="${ctx.helpers.postUrl(post.next)}"><span>${ctx.i18n.t('post.next')}</span>${post.next.title}</a>`
        : html`<span></span>`
    }
  </nav>`
}

/** Tags by default; categories pass their own list and URL helper. */
export function tagCloud(
  ctx: ThemeContext,
  tags: TagView[] = ctx.tags ?? [],
  url: (tag: TagView) => string = ctx.helpers.tagUrl,
) {
  if (tags.length === 0) return html`<p class="empty">${ctx.i18n.t('tag.empty')}</p>`
  return html`<ul class="scholar-index-terms">
    ${tags.map(
      (tag) => html`<li>
        <a href="${url(tag)}">${tag.name}</a>
        <span>${tag.count}</span>
      </li>`,
    )}
  </ul>`
}

export function archiveList(ctx: ThemeContext) {
  const archives = ctx.archives ?? []
  return html`<div class="scholar-archive">
    ${archives.map(
      (group) => html`<section>
        <h2>${group.year}</h2>
        ${articleList(ctx, group.posts, { abstract: false })}
      </section>`,
    )}
  </div>`
}

export function pageHeader(ctx: ThemeContext, extra?: { count?: number; countKey?: string }) {
  return html`<header class="scholar-page-header">
    <p class="scholar-kicker">${ctx.page.kind.toUpperCase()}</p>
    <h1>${ctx.page.title}</h1>
    ${
      extra?.count !== undefined
        ? html`<p class="scholar-count">${ctx.i18n.t(extra.countKey ?? 'page.tagPosts', { count: extra.count })}</p>`
        : ''
    }
  </header>`
}

function counted(names: string[]): string[] {
  const counts = new Map<string, number>()
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
}

function panelModule(title: string, body: unknown) {
  return html`<section class="scholar-module">
    <h2 class="scholar-module-title">${title}</h2>
    ${body}
  </section>`
}

/** The article's contents for the side panel; empty without headings or when turned off. */
export function tocModule(ctx: ThemeContext) {
  if (!getScholarConfig(ctx).showToc || ctx.tocHtml.value.length === 0) return html``
  return html`<section class="scholar-module scholar-toc">${ctx.tocHtml}</section>`
}

export function recentModule(ctx: ThemeContext, posts: Post[]) {
  if (posts.length === 0) return html``
  return panelModule(
    ctx.i18n.t('home.latest'),
    html`<ol class="scholar-recent">
      ${posts.slice(0, 5).map(
        (post) => html`<li>
          <a href="${ctx.helpers.postUrl(post)}">${post.title}</a>
          <time datetime="${post.date}">${ctx.helpers.date(post.date)}</time>
        </li>`,
      )}
    </ol>`,
  )
}

export function categoryModule(ctx: ThemeContext, posts: Post[]) {
  const names = counted(posts.flatMap((post) => post.categories))
  if (names.length === 0) return html``
  return panelModule(
    ctx.i18n.t('page.categories'),
    html`<ul class="scholar-terms">
      ${names.map((name) => html`<li><a href="${ctx.helpers.categoryUrlByName(name)}">${name}</a></li>`)}
    </ul>`,
  )
}

export function keywordModule(ctx: ThemeContext, names: string[]) {
  if (names.length === 0) return html``
  return panelModule(
    ctx.i18n.t('page.keywords'),
    html`<p class="scholar-module-keywords">${tagLinks(ctx, names)}</p>`,
  )
}

/** Side panel for article lists: recent articles, then their categories and keywords. */
export function listPanel(ctx: ThemeContext, posts: Post[]) {
  return html`${recentModule(ctx, posts)}${categoryModule(ctx, posts)}${keywordModule(
    ctx,
    counted(posts.flatMap((post) => post.tags)),
  )}`
}
