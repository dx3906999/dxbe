import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { tocModule } from './components.ts'

export const page: LayoutFn = (ctx) => {
  const page = ctx.pageItem
  if (!page) return baseLayout(ctx, html`<p>${ctx.seo.description}</p>`)
  return baseLayout(
    ctx,
    html`<article
      class="post page"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${page.title}">
      <header class="post-header">
        <h1>${page.title}</h1>
      </header>
      <div class="post-body">
        ${page.html}
      </div>
    </article>`,
    { panel: tocModule(ctx) },
  )
}
