import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { bank, pad, placard } from './components.ts'

export const tags: LayoutFn = (ctx) => {
  const list = ctx.tags ?? []
  const body = html`${placard({
    label: 'SECTION 03 · CLASSIFIER',
    title: ctx.page.title,
    count: pad(list.length, 3),
  })}
  ${bank(list, (entry) => ctx.helpers.tagUrl(entry), ctx.i18n.t('tag.empty'))}`
  return baseLayout(ctx, { body })
}
