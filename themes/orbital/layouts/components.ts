import { html, type Post, type TagView, type ThemeContext } from '../../../src/theme/api.ts'
import { getOrbitalConfig } from '../config.ts'

export function tagLinks(ctx: ThemeContext, tags: string[]) {
  if (tags.length === 0) return html``
  return html`<span class="orbital-tags" aria-label="${ctx.i18n.t('post.tags')}">
    ${tags.map((tag) => html`<a href="${ctx.helpers.tagUrlByName(tag)}">${tag}</a>`)}
  </span>`
}

export function postList(ctx: ThemeContext, posts: Post[]) {
  if (posts.length === 0) return html`<p class="empty">${ctx.i18n.t('post.empty')}</p>`
  return html`<ol class="index-list">
    ${posts.map(
      (post, index) => html`<li class="index-row">
        <span class="index-num">${String(index + 1).padStart(2, '0')}</span>
        <time class="index-date" datetime="${post.date}">${ctx.helpers.date(post.date, 'short')}</time>
        <a class="index-title" href="${ctx.helpers.postUrl(post)}">${post.title}</a>
        <span class="index-tags">${post.tags.map(
          (tag, tagIndex) =>
            html`${tagIndex > 0 ? ' / ' : ''}<a href="${ctx.helpers.tagUrlByName(tag)}">${tag}</a>`,
        )}</span>
      </li>`,
    )}
  </ol>`
}

export function pagination(ctx: ThemeContext) {
  const pagination = ctx.pagination
  if (!pagination || pagination.total <= 1) return html``
  const current = String(pagination.current).padStart(2, '0')
  const total = String(pagination.total).padStart(2, '0')
  return html`<nav class="orbital-pagination" aria-label="${ctx.i18n.t('paginator.label')}">
    ${
      pagination.prevUrl
        ? html`<a rel="prev" href="${ctx.helpers.url(pagination.prevUrl)}">[ ${ctx.i18n.t('paginator.prev')} ]</a>`
        : html`<span></span>`
    }
    <span class="pagination-count">${current} / ${total}</span>
    ${
      pagination.nextUrl
        ? html`<a rel="next" href="${ctx.helpers.url(pagination.nextUrl)}">[ ${ctx.i18n.t('paginator.next')} ]</a>`
        : html`<span></span>`
    }
  </nav>`
}

export function prevNext(ctx: ThemeContext) {
  const post = ctx.post
  if (!post) return html``
  return html`<nav class="orbital-prev-next" aria-label="${ctx.i18n.t('paginator.label')}">
    ${
      post.prev
        ? html`<a rel="prev" href="${ctx.helpers.postUrl(post.prev)}">
          <span>${ctx.i18n.t('post.prev')}</span>
          <strong>${post.prev.title}</strong>
        </a>`
        : html`<span></span>`
    }
    ${
      post.next
        ? html`<a rel="next" href="${ctx.helpers.postUrl(post.next)}">
          <span>${ctx.i18n.t('post.next')}</span>
          <strong>${post.next.title}</strong>
        </a>`
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
  return html`<ul class="orbital-tag-grid">
    ${tags.map(
      (tag) => html`<li>
        <a href="${url(tag)}">
          <span class="tag-name">${tag.name}</span>
          <span class="tag-count">${String(tag.count).padStart(2, '0')}</span>
        </a>
      </li>`,
    )}
  </ul>`
}

export function archiveList(ctx: ThemeContext) {
  const archives = ctx.archives ?? []
  return html`<div class="orbital-archive">
    ${archives.map(
      (group) => html`<section class="archive-block">
        <h2><span>${group.year}</span><span>${String(group.posts.length).padStart(2, '0')}</span></h2>
        ${postList(ctx, group.posts)}
      </section>`,
    )}
  </div>`
}

export function pageHeader(ctx: ThemeContext, extra?: { count?: number; countKey?: string }) {
  return html`<header class="orbital-page-header">
    <p class="kicker">${ctx.page.kind.toUpperCase()}</p>
    <h1>${ctx.page.title}</h1>
    ${
      extra?.count !== undefined
        ? html`<p class="page-count">${ctx.i18n.t(extra.countKey ?? 'page.tagPosts', { count: extra.count })}</p>`
        : ''
    }
  </header>`
}

export function postMeta(ctx: ThemeContext, post: Post) {
  const config = getOrbitalConfig(ctx)
  return html`<div class="orbital-meta-grid">
    <div><span>${ctx.i18n.t('post.date')}</span><time datetime="${post.date}">${ctx.helpers.date(post.date, 'short')}</time></div>
    ${
      config.showReadingTime
        ? html`<div><span>${ctx.i18n.t('post.read')}</span>${post.readingMinutes} ${ctx.i18n.t('post.minutes')}</div>`
        : ''
    }
    <div><span>${ctx.i18n.t('post.tags')}</span>${tagLinks(ctx, post.tags)}</div>
  </div>`
}
