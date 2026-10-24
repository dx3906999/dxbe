import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { placard } from './components.ts'

export const search: LayoutFn = (ctx) => {
  const { t } = ctx.i18n
  const body = html`${placard({ label: 'SECTION 04 · QUERY', title: ctx.page.title })}
  <section class="ap-console" data-search
      data-lang="${ctx.i18n.lang}"
      data-index="${ctx.assets.searchIndex ?? ''}"
      data-loading="${t('search.loading')}"
      data-empty="${t('search.empty')}"
      data-error="${t('search.error')}"
      data-results="${t('search.results')}">
    <label class="ap-console__field">
      <span class="ap-label">QRY ▸</span>
      <input type="search" data-search-input placeholder="${t('search.placeholder')}" autocomplete="off">
    </label>
    <p class="ap-console__status" data-search-status role="status" aria-live="polite"></p>
    <ol class="ap-results" data-search-results></ol>
    <noscript><p class="ap-empty">${t('search.noscript')}</p></noscript>
  </section>`
  return baseLayout(ctx, { body })
}
