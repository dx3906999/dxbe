import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { getFolioConfig } from '../config.ts'
import { baseLayout } from './base.ts'
import { postCover, postMeta, prevNext, tagLinks, tagModule, tocModule } from './components.ts'

export const post: LayoutFn = (ctx) => {
  const post = ctx.post
  if (!post) return baseLayout(ctx, html`<p>${ctx.seo.description}</p>`)
  const config = getFolioConfig(ctx)
  const hasToc = config.showToc && ctx.tocHtml.value.length > 0

  return baseLayout(
    ctx,
    html`<article
      class="post"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${post.title}">
      <header class="post-header">
        <h1>${post.title}</h1>
        ${postMeta(ctx, post)}
        ${tagLinks(ctx, post.tags)}
      </header>
      ${postCover(ctx, post)}
      ${
        hasToc
          ? html`<details class="toc-mobile">
            <summary>${ctx.i18n.t('toc.title')}</summary>
            ${ctx.tocHtml}
          </details>`
          : ''
      }
      <div class="post-layout">
        <div class="post-body">
          ${post.html}
        </div>
      </div>
      ${prevNext(ctx)}
    </article>`,
    {
      panel: html`${tocModule(ctx)}${tagModule(ctx, post.tags)}`,
      crumb: html`<a href="${ctx.routes.posts}">${ctx.i18n.t('nav.posts')}</a><span class="crumb-sep" aria-hidden="true">/</span><span aria-current="page">${post.title}</span>`,
    },
  )
}
