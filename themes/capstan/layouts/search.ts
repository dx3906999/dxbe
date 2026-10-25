import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { printHead, screen } from './components.ts'

export const search: LayoutFn = (ctx) => {
  const { t } = ctx.i18n
  const body = html`${printHead({ program: 'SEEK', title: ctx.page.title })}
  <section class="cp-seek" data-search
      data-lang="${ctx.i18n.lang}"
      data-index="${ctx.assets.searchIndex ?? ''}"
      data-loading="${t('search.loading')}"
      data-empty="${t('search.empty')}"
      data-error="${t('search.error')}"
      data-results="${t('search.results')}">
    ${screen(
      html`<label class="cp-seek__field">
        <span class="cp-seek__prompt" aria-hidden="true">SEEK&gt;</span>
        <input type="search" data-search-input placeholder="${t('search.placeholder')}" autocomplete="off">
      </label>
      <p class="cp-seek__status" data-search-status role="status" aria-live="polite"></p>`,
      'seek',
    )}
    <ol class="cp-results" data-search-results></ol>
    <noscript><p class="cp-empty">${t('search.noscript')}</p></noscript>
  </section>`
  return baseLayout(ctx, { body })
}
