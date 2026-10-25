import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { getScholarConfig } from '../config.ts'
import { baseLayout } from './base.ts'
import { byline, postCover, prevNext, tagLinks } from './components.ts'

export const post: LayoutFn = (ctx) => {
  const post = ctx.post
  if (!post) return baseLayout(ctx, html`<p>${ctx.seo.description}</p>`)
  const config = getScholarConfig(ctx)
  const hasToc = config.showToc && ctx.tocHtml.value.length > 0

  return baseLayout(
    ctx,
    html`<article
      class="scholar-post"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${post.title}">
      <header class="scholar-title">
        <p class="scholar-kicker">${ctx.i18n.t('page.article')}</p>
        <h1>${post.title}</h1>
        ${byline(ctx, post)}
      </header>
      ${postCover(ctx, post)}
      <section class="scholar-abstract" aria-labelledby="abstract-title">
        <h2 id="abstract-title">${ctx.i18n.t('page.abstract')}</h2>
        <p>${post.summary}</p>
        ${
          post.tags.length > 0
            ? html`<p class="abstract-keywords">${ctx.i18n.t('page.keywords')}: ${tagLinks(ctx, post.tags)}</p>`
            : ''
        }
      </section>
      ${
        hasToc
          ? html`<details class="scholar-toc-mobile">
            <summary>${ctx.i18n.t('toc.title')}</summary>
            ${ctx.tocHtml}
          </details>`
          : ''
      }
      <div class="scholar-layout ${hasToc ? '' : 'no-toc'}">
        ${hasToc ? html`<aside class="scholar-toc">${ctx.tocHtml}</aside>` : ''}
        <div class="scholar-body">
          ${post.html}
        </div>
      </div>
      ${prevNext(ctx)}
    </article>`,
  )
}
