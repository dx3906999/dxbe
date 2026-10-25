import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { pageHeader, pagination, postList } from './components.ts'

export const category: LayoutFn = (ctx) => {
  return baseLayout(
    ctx,
    html`${pageHeader(ctx, { count: ctx.category?.count ?? 0, countKey: 'page.categoryPosts' })}
    ${postList(ctx, ctx.posts ?? [])}
    ${pagination(ctx)}`,
  )
}
