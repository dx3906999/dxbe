import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { getCapstanConfig } from '../config.ts'
import { baseLayout } from './base.ts'
import {
  jobCode,
  langPrefix,
  levelMeter,
  monitorToc,
  pad,
  stamp,
  tagKeys,
  tagModule,
} from './components.ts'

export const post: LayoutFn = (ctx) => {
  const entry = ctx.post
  if (!entry) return baseLayout(ctx, { body: html`` })
  const config = getCapstanConfig(ctx)
  const { t } = ctx.i18n
  const url = ctx.helpers.url
  const code = jobCode(ctx, entry.date)

  const body = html`<article class="cp-article"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${entry.title}">
    <header class="cp-ticket">
      <dl class="cp-ticket__fields">
        <div><dt>JOB</dt><dd>${code}</dd></div>
        <div><dt>${t('post.date')}</dt><dd><time datetime="${entry.date}">${stamp(ctx, entry.date)}</time></dd></div>
        ${entry.updated ? html`<div><dt>${t('post.updated')}</dt><dd><time datetime="${entry.updated}">${stamp(ctx, entry.updated)}</time></dd></div>` : ''}
        ${config.showReadingTime ? html`<div><dt>${t('post.read')}</dt><dd>${pad(entry.readingMinutes, 2)} ${t('post.minutes')}</dd></div>` : ''}
        <div><dt>${t('post.lang')}</dt><dd>${ctx.i18n.lang.toUpperCase()}</dd></div>
        ${
          entry.categories.length > 0
            ? html`<div><dt>${t('page.categories')}</dt><dd>${entry.categories.map(
                (name, n) =>
                  html`${n > 0 ? ' / ' : ''}<a href="${ctx.helpers.categoryUrlByName(name)}">${name}</a>`,
              )}</dd></div>`
            : ''
        }
      </dl>
      ${entry.cover ? html`<figure class="cp-ticket__cover"><img src="${url(entry.cover.url)}" alt="${entry.cover.alt}" decoding="async"></figure>` : ''}
      <h1 class="cp-ticket__title">${entry.title}</h1>
      ${entry.summary ? html`<p class="cp-ticket__sum">${entry.summary}</p>` : ''}
    </header>
    <div class="cp-prose">${entry.html}</div>
    <footer class="cp-article__foot">
      <p class="cp-endmark" aria-hidden="true">END OF JOB ${code}</p>
      ${entry.tags.length > 0 ? html`<div class="cp-article__tags"><span class="cp-engrave">${t('post.tags')}</span>${tagKeys(ctx, entry.tags)}</div>` : ''}
      <nav class="cp-adjacent" aria-label="${t('panel.route')}">
        ${entry.prev ? html`<a class="cp-adjacent__key" href="${url(entry.prev.url)}" rel="prev"><span class="cp-engrave">◂◂ ${t('post.prev')}</span><span class="cp-adjacent__title">${entry.prev.title}</span></a>` : html`<span class="cp-adjacent__key" aria-disabled="true"><span class="cp-engrave">◂◂ ——</span></span>`}
        ${entry.next ? html`<a class="cp-adjacent__key cp-adjacent__key--next" href="${url(entry.next.url)}" rel="next"><span class="cp-engrave">${t('post.next')} ▸▸</span><span class="cp-adjacent__title">${entry.next.title}</span></a>` : html`<span class="cp-adjacent__key cp-adjacent__key--next" aria-disabled="true"><span class="cp-engrave">—— ▸▸</span></span>`}
      </nav>
    </footer>
  </article>`

  const panel = html`${levelMeter(ctx)}${config.showToc ? monitorToc(ctx) : ''}${tagModule(ctx, t('panel.related'), entry.tags)}`
  const parent = { label: 'LOG', url: url(`${langPrefix(ctx)}/archives/`) }
  return baseLayout(ctx, { body, panel, crumb: { parent, current: code } })
}
