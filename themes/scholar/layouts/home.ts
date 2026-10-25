import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { articleList } from './components.ts'

/** Profile home: the introduction page, then recent articles without abstracts. */
export const home: LayoutFn = (ctx) => {
  const page = ctx.pageItem
  const latest = (ctx.posts ?? []).slice(0, 5)
  return baseLayout(
    ctx,
    html`<article
      class="scholar-post scholar-page"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${page?.title ?? ctx.site.title}">
      <header class="scholar-title">
        <p class="scholar-kicker">${ctx.site.author.name}</p>
        <h1>${page?.title ?? ctx.site.title}</h1>
      </header>
      <div class="scholar-layout no-toc">
        <div class="scholar-body">${page ? page.html : ''}</div>
      </div>
    </article>
    ${
      latest.length > 0
        ? html`<section class="scholar-latest" aria-labelledby="home-latest">
          <h2 id="home-latest" class="scholar-latest-title">${ctx.i18n.t('home.latest')}</h2>
          ${articleList(ctx, latest, { abstract: false })}
          <p class="scholar-latest-all"><a href="${ctx.routes.posts}">${ctx.i18n.t('home.allPosts')}</a></p>
        </section>`
        : ''
    }`,
  )
}
