import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { pagination, placard, postList } from './components.ts'

export const category: LayoutFn = (ctx) => {
  const current = ctx.category
  const posts = ctx.posts ?? []
  const body = html`${placard({
    label: 'SECTION 05 · DIRECTORY',
    title: current?.name ?? ctx.page.title,
    count: ctx.i18n.t('page.categoryPosts', { count: current?.count ?? posts.length }),
  })}
  ${postList(ctx, posts)}
  ${pagination(ctx)}`
  const crumb = html`<a href="${ctx.routes.categories}">CAT</a><span class="ap-sep" aria-hidden="true">/</span><span aria-current="page">${current?.name ?? ''}</span>`
  return baseLayout(ctx, { body, crumb })
}
