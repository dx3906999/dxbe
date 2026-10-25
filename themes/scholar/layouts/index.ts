import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { articleList, listPanel, pagination } from './components.ts'

export const index: LayoutFn = (ctx) => {
  const current = ctx.pagination?.current ?? 1
  return baseLayout(
    ctx,
    html`<header class="issue-head">
      <h1>${ctx.i18n.t('page.indexLabel')}</h1>
      <p class="issue-description">${ctx.site.description}</p>
      ${
        current > 1
          ? html`<p class="scholar-kicker">${ctx.i18n.t('page.pageOf', { n: current })}</p>`
          : ''
      }
    </header>
    ${articleList(ctx, ctx.posts ?? [])}
    ${pagination(ctx)}`,
    { panel: listPanel(ctx, ctx.posts ?? []) },
  )
}
