import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { entryList, langPrefix, pagination, printHead } from './components.ts'

export const tag: LayoutFn = (ctx) => {
  const current = ctx.tag
  const posts = ctx.posts ?? []
  const body = html`${printHead({
    program: 'FILTER',
    title: current?.name ?? ctx.page.title,
    count: ctx.i18n.t('page.tagPosts', { count: current?.count ?? posts.length }),
  })}
  ${entryList(ctx, posts)}
  ${pagination(ctx)}`
  const parent = { label: 'TAGS', url: ctx.helpers.url(`${langPrefix(ctx)}/tags/`) }
  return baseLayout(ctx, { body, crumb: { parent, current: current?.name ?? '' } })
}
