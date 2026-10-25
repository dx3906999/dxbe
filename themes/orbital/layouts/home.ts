import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { postList } from './components.ts'

/** Profile home: the introduction page, then the latest entries as an index. */
export const home: LayoutFn = (ctx) => {
  const page = ctx.pageItem
  const latest = (ctx.posts ?? []).slice(0, 5)
  return baseLayout(
    ctx,
    html`<article
      class="orbital-post orbital-page"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${page?.title ?? ctx.site.title}">
      <header class="orbital-post-header">
        <p class="kicker">${ctx.site.author.name}</p>
        <h1>${page?.title ?? ctx.site.title}</h1>
      </header>
      ${page ? html`<div class="orbital-body">${page.html}</div>` : ''}
    </article>
    ${
      latest.length > 0
        ? html`<section class="orbital-latest" aria-labelledby="home-latest">
          <header class="orbital-latest-head">
            <h2 id="home-latest" class="kicker">${ctx.i18n.t('home.latest')}</h2>
            <a class="kicker" href="${ctx.routes.posts}">[ ${ctx.i18n.t('home.allPosts')} ]</a>
          </header>
          ${postList(ctx, latest)}
        </section>`
        : ''
    }`,
  )
}
