import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import {
  pad,
  pagination,
  placard,
  postList,
  recentModule,
  tagModule,
  uniqueTags,
} from './components.ts'

export const index: LayoutFn = (ctx) => {
  const posts = ctx.posts ?? []
  const page = ctx.pagination?.current ?? 1
  const isHome = ctx.routes.posts === ctx.routes.home
  const body = html`${placard({
    label: `FLIGHT LOG · VOL ${pad(page, 2)}`,
    title: isHome ? ctx.site.title : ctx.page.title,
    lede: isHome ? ctx.site.tagline || ctx.site.description : undefined,
    count: `${pad(posts.length, 3)} ${ctx.i18n.t('page.postsUnit')}`,
    schematic: page === 1 && isHome,
  })}
  ${postList(ctx, posts)}
  ${pagination(ctx)}`
  const panel = html`${recentModule(ctx, posts)}${tagModule(ctx, ctx.i18n.t('panel.tags'), uniqueTags(posts))}`
  return baseLayout(ctx, { body, panel })
}
