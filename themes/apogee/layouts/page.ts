import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { checklist, gauge, stationCode, stripe } from './components.ts'

export const page: LayoutFn = (ctx) => {
  const item = ctx.pageItem
  if (!item) return baseLayout(ctx, { body: html`` })
  const body = html`<article class="ap-article"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${item.title}">
    <header class="ap-dossier" data-reveal>
      <div class="ap-dossier__bar">
        <span class="ap-label"><span class="ap-label__key">DOC</span> ${stationCode(item.slug)}</span>
        <span class="ap-hazard" aria-hidden="true"></span>
      </div>
      <h1 class="ap-dossier__title">${item.title}</h1>
      ${item.summary ? html`<p class="ap-dossier__sum">${item.summary}</p>` : ''}
      ${stripe()}
    </header>
    <div class="ap-prose">${item.html}</div>
  </article>`
  const toc = checklist(ctx)
  const panel = toc.value ? html`${gauge()}${toc}` : undefined
  return baseLayout(ctx, { body, panel })
}
