import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { levelMeter, monitorToc } from './components.ts'

export const page: LayoutFn = (ctx) => {
  const item = ctx.pageItem
  if (!item) return baseLayout(ctx, { body: html`` })
  const body = html`<article class="cp-article"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${item.title}">
    <header class="cp-ticket">
      <dl class="cp-ticket__fields">
        <div><dt>DOC</dt><dd>${item.slug.toUpperCase()}</dd></div>
        <div><dt>${ctx.i18n.t('post.lang')}</dt><dd>${ctx.i18n.lang.toUpperCase()}</dd></div>
      </dl>
      <h1 class="cp-ticket__title">${item.title}</h1>
      ${item.summary ? html`<p class="cp-ticket__sum">${item.summary}</p>` : ''}
    </header>
    <div class="cp-prose">${item.html}</div>
  </article>`
  const toc = monitorToc(ctx)
  const panel = toc.value ? html`${levelMeter(ctx)}${toc}` : undefined
  return baseLayout(ctx, { body, panel, crumb: { current: item.slug.toUpperCase() } })
}
