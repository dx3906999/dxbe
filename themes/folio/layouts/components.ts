import { html, type Post, type TagView, type ThemeContext } from '../../../src/theme/api.ts'
import { getFolioConfig } from '../config.ts'

export function postMeta(ctx: ThemeContext, post: Post) {
  const config = getFolioConfig(ctx)
  return html`<p class="post-meta">
    <time datetime="${post.date}">${ctx.helpers.date(post.date)}</time>
    ${
      config.showReadingTime
        ? html`<span aria-hidden="true"> · </span><span>${post.readingMinutes} ${ctx.i18n.t('post.minutes')}</span>`
        : ''
    }
  </p>`
}

export function tagLinks(ctx: ThemeContext, tags: string[]) {
  if (tags.length === 0) return html``
  return html`<ul class="tag-list" aria-label="${ctx.i18n.t('post.tags')}">
    ${tags.map((tag) => html`<li><a href="${ctx.helpers.tagUrlByName(tag)}">#${tag}</a></li>`)}
  </ul>`
}

/** Archive lists stay compact; every other list shows covers. */
export function postList(ctx: ThemeContext, posts: Post[]) {
  if (posts.length === 0) return html`<p class="empty">${ctx.i18n.t('post.empty')}</p>`
  const covers = ctx.page.kind !== 'archive'
  return html`<ol class="post-list">
    ${posts.map((post) => {
      const cover = covers ? post.cover : undefined
      return html`<li class="post-item${cover ? ' has-cover' : ''}">
        ${
          cover
            ? html`<a class="post-thumb" href="${ctx.helpers.postUrl(post)}" tabindex="-1" aria-hidden="true">
              <img src="${ctx.helpers.url(cover.url)}" alt="" loading="lazy" decoding="async">
            </a>`
            : ''
        }
        <div class="post-item-body">
          ${postMeta(ctx, post)}
          <h2 class="post-title"><a href="${ctx.helpers.postUrl(post)}">${post.title}</a></h2>
          <p class="post-summary">${post.summary}</p>
          ${tagLinks(ctx, post.tags)}
        </div>
      </li>`
    })}
  </ol>`
}

/** The cover above a post body; empty when the post has none. */
export function postCover(ctx: ThemeContext, post: Post) {
  if (!post.cover) return html``
  return html`<figure class="post-cover">
    <img src="${ctx.helpers.url(post.cover.url)}" alt="${post.cover.alt}" decoding="async">
  </figure>`
}

export function pagination(ctx: ThemeContext) {
  const pagination = ctx.pagination
  if (!pagination || pagination.total <= 1) return html``
  return html`<nav class="pagination" aria-label="${ctx.i18n.t('paginator.label')}">
    ${
      pagination.prevUrl
        ? html`<a rel="prev" href="${ctx.helpers.url(pagination.prevUrl)}">← ${ctx.i18n.t('paginator.prev')}</a>`
        : html`<span></span>`
    }
    <span class="pagination-pages">
      ${pagination.pages.map((page) =>
        page.n === pagination.current
          ? html`<span aria-current="page">${page.n}</span>`
          : html`<a href="${ctx.helpers.url(page.url)}">${page.n}</a>`,
      )}
    </span>
    ${
      pagination.nextUrl
        ? html`<a rel="next" href="${ctx.helpers.url(pagination.nextUrl)}">${ctx.i18n.t('paginator.next')} →</a>`
        : html`<span></span>`
    }
  </nav>`
}

export function prevNext(ctx: ThemeContext) {
  const post = ctx.post
  if (!post) return html``
  return html`<nav class="prev-next" aria-label="${ctx.i18n.t('post.toc')}">
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
  return html`<ul class="tag-cloud">
    ${tags.map(
      (tag) => html`<li>
        <a href="${url(tag)}">${tag.name}<span>${tag.count}</span></a>
      </li>`,
    )}
  </ul>`
}

export function archiveList(ctx: ThemeContext) {
  const archives = ctx.archives ?? []
  return html`<div class="archive-list">
    ${archives.map(
      (group) => html`<section class="archive-year">
        <h2><a href="${ctx.routes.archives}${group.year}/">${group.year}</a><span>${group.posts.length}</span></h2>
        ${postList(ctx, group.posts)}
      </section>`,
    )}
  </div>`
}

export function pageHeader(ctx: ThemeContext, extra?: { count?: number; countKey?: string }) {
  return html`<header class="page-header">
    <h1>${ctx.page.title}</h1>
    ${
      extra?.count !== undefined
        ? html`<p class="page-subtitle">${ctx.i18n.t(extra.countKey ?? 'page.tagPosts', { count: extra.count })}</p>`
        : ''
    }
  </header>`
}
