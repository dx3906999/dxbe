import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { postList } from './components.ts'

/** Profile home: the introduction page, then the three latest posts. */
export const home: LayoutFn = (ctx) => {
  const page = ctx.pageItem
  const latest = (ctx.posts ?? []).slice(0, 3)
  return baseLayout(
    ctx,
    html`<article
      class="post page profile"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${page?.title ?? ctx.site.title}">
      <header class="post-header">
        <h1>${page?.title ?? ctx.site.title}</h1>
      </header>
      ${page ? html`<div class="post-body">${page.html}</div>` : ''}
    </article>
    ${
      latest.length > 0
        ? html`<section class="home-latest" aria-labelledby="home-latest">
          <h2 id="home-latest" class="home-latest-title">${ctx.i18n.t('home.latest')}</h2>
          ${postList(ctx, latest)}
          <p class="home-all"><a href="${ctx.routes.posts}">${ctx.i18n.t('home.allPosts')} →</a></p>
        </section>`
        : ''
    }`,
  )
}
