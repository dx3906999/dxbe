import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { articleList, pageHeader, pagination } from './components.ts'

export const category: LayoutFn = (ctx) => {
  return baseLayout(
    ctx,
    html`${pageHeader(ctx, { count: ctx.category?.count ?? 0, countKey: 'page.categoryPosts' })}
    ${articleList(ctx, ctx.posts ?? [])}
    ${pagination(ctx)}`,
  )
}
