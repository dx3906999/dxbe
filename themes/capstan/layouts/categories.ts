import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { chart, pad, printHead } from './components.ts'

export const categories: LayoutFn = (ctx) => {
  const list = ctx.categories ?? []
  const body = html`${printHead({
    program: 'CHANNELS',
    title: ctx.page.title,
    count: pad(list.length, 3),
  })}
  ${chart(list, (item) => ctx.helpers.categoryUrl(item), ctx.i18n.t('tag.empty'))}`
  return baseLayout(ctx, { body })
}
