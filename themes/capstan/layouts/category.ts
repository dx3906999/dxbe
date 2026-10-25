import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { entryList, pagination, printHead } from './components.ts'

export const category: LayoutFn = (ctx) => {
  const current = ctx.category
  const posts = ctx.posts ?? []
  const body = html`${printHead({
    program: 'CHANNEL',
    title: current?.name ?? ctx.page.title,
    count: ctx.i18n.t('page.categoryPosts', { count: current?.count ?? posts.length }),
  })}
  ${entryList(ctx, posts)}
  ${pagination(ctx)}`
  const parent = { label: 'CHANNELS', url: ctx.routes.categories }
  return baseLayout(ctx, { body, crumb: { parent, current: current?.name ?? '' } })
}
