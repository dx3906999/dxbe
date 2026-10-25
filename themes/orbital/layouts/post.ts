import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { getOrbitalConfig } from '../config.ts'
import { baseLayout } from './base.ts'
import { postCover, postMeta, prevNext } from './components.ts'

export const post: LayoutFn = (ctx) => {
  const post = ctx.post
  if (!post) return baseLayout(ctx, html`<p>${ctx.seo.description}</p>`)
  const config = getOrbitalConfig(ctx)
  const hasToc = config.showToc && ctx.tocHtml.value.length > 0

  return baseLayout(
    ctx,
    html`<article
      class="orbital-post"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${post.title}">
      <header class="orbital-post-header">
        <p class="kicker">${ctx.i18n.t('post.entry')} / ${ctx.helpers.isoDate(post.date)}</p>
        <h1>${post.title}</h1>
        ${postMeta(ctx, post)}
      </header>
      ${postCover(ctx, post)}
      ${
        hasToc
          ? html`<section class="orbital-toc">
            <p class="kicker">${ctx.i18n.t('toc.title')}</p>
            ${ctx.tocHtml}
          </section>`
          : ''
      }
      <div class="orbital-body">
        ${post.html}
      </div>
      ${prevNext(ctx)}
    </article>`,
  )
}
