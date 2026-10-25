import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { listPanel, pagination, postList } from './components.ts'

export const index: LayoutFn = (ctx) => {
  const current = ctx.pagination?.current ?? 1
  const paged = current > 1
  const posts = ctx.posts ?? []
  return baseLayout(
    ctx,
    html`<header class="index-header">
      <h1>${ctx.site.title}</h1>
      ${
        paged
          ? html`<p class="eyebrow">${ctx.i18n.t('page.pageOf', { n: current })}</p>`
          : html`<p class="index-tagline">${ctx.site.tagline || ctx.site.description}</p>`
      }
    </header>
    ${postList(ctx, posts)}
    ${pagination(ctx)}`,
    { panel: listPanel(ctx, posts) },
  )
}
