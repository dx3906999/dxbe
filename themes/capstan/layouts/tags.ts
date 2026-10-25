import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { chart, pad, printHead } from './components.ts'

export const tags: LayoutFn = (ctx) => {
  const list = ctx.tags ?? []
  const body = html`${printHead({
    program: 'FILTER',
    title: ctx.page.title,
    count: pad(list.length, 3),
  })}
  ${chart(list, (item) => ctx.helpers.tagUrl(item), ctx.i18n.t('tag.empty'))}`
  return baseLayout(ctx, { body })
}
