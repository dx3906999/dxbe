import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { langPrefix } from './components.ts'

export const notFound: LayoutFn = (ctx) => {
  const body = html`<section class="ap-lost" data-reveal>
    <div class="ap-lost__scope" aria-hidden="true">
      <span class="ap-lost__ring"></span><span class="ap-lost__ring"></span><span class="ap-lost__sweep"></span>
    </div>
    <p class="ap-label">ERR 404 · LOS</p>
    <h1 class="ap-lost__title">${ctx.page.title}</h1>
    <p class="ap-lost__body">${ctx.i18n.t('page.notFoundBody')}</p>
    <a class="ap-btn ap-btn--hot" href="${ctx.helpers.url(`${langPrefix(ctx)}/`)}">${ctx.i18n.t('post.backHome')}</a>
  </section>`
  return baseLayout(ctx, { body })
}
