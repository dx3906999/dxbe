import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { bank, pad, placard } from './components.ts'

export const categories: LayoutFn = (ctx) => {
  const list = ctx.categories ?? []
  const body = html`${placard({
    label: 'SECTION 05 · DIRECTORY',
    title: ctx.page.title,
    count: pad(list.length, 3),
  })}
  ${bank(list, (entry) => ctx.helpers.categoryUrl(entry), ctx.i18n.t('tag.empty'))}`
  return baseLayout(ctx, { body })
}
