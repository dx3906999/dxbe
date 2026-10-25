import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { getScholarConfig } from '../config.ts'
import { baseLayout } from './base.ts'
import { tocModule } from './components.ts'

export const page: LayoutFn = (ctx) => {
  const page = ctx.pageItem
  if (!page) return baseLayout(ctx, html`<p>${ctx.seo.description}</p>`)
  const config = getScholarConfig(ctx)
  const hasToc = config.showToc && ctx.tocHtml.value.length > 0
  return baseLayout(
    ctx,
    html`<article
      class="scholar-post scholar-page"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${page.title}">
      <header class="scholar-title">
        <p class="scholar-kicker">${ctx.i18n.t('page.pageLabel')}</p>
        <h1>${page.title}</h1>
      </header>
      ${page.summary ? html`<p class="scholar-lead">${page.summary}</p>` : ''}
      ${
        hasToc
          ? html`<details class="scholar-toc-mobile">
            <summary>${ctx.i18n.t('toc.title')}</summary>
            ${ctx.tocHtml}
          </details>`
          : ''
      }
      <div class="scholar-layout">
        <div class="scholar-body">
          ${page.html}
        </div>
      </div>
    </article>`,
    { panel: tocModule(ctx) },
  )
}
