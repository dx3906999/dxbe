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
    ${posts.map(
      (post) => html`<li class="article-item">
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
      </li>`,
    )}
  </ol>`
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
