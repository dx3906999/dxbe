import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { langPrefix, screen } from './components.ts'

export const notFound: LayoutFn = (ctx) => {
  const body = html`<section class="cp-nosignal">
    ${screen(html`<div class="cp-nosignal__bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><p class="cp-nosignal__code">ERR 404</p>`, 'bars')}
    <h1 class="cp-head__title">${ctx.page.title}</h1>
    <p class="cp-head__lede">${ctx.i18n.t('page.notFoundBody')}</p>
    <a class="cp-btn" href="${ctx.helpers.url(`${langPrefix(ctx)}/`)}">◂ ${ctx.i18n.t('post.backHome')}</a>
  </section>`
  return baseLayout(ctx, { body })
}
