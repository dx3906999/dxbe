import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { getApogeeConfig } from '../config.ts'
import { baseLayout } from './base.ts'
import {
  checklist,
  gauge,
  icon,
  langPrefix,
  missionCode,
  pad,
  stamp,
  stationCode,
  stripe,
  tagChips,
  tagModule,
} from './components.ts'

export const post: LayoutFn = (ctx) => {
  const entry = ctx.post
  if (!entry) return baseLayout(ctx, { body: html`` })
  const config = getApogeeConfig(ctx)
  const { t } = ctx.i18n
  const url = ctx.helpers.url
  const code = missionCode(ctx, entry.date)

  const body = html`<article class="ap-article"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${entry.title}">
    <header class="ap-dossier" data-reveal>
      <div class="ap-dossier__bar">
        <span class="ap-label"><span class="ap-label__key">LOG</span> ${code}</span>
        <span class="ap-label ap-label--dim">STA ${stationCode(entry.slug)}</span>
        <span class="ap-hazard" aria-hidden="true"></span>
      </div>
      <h1 class="ap-dossier__title">${entry.title}</h1>
      ${entry.summary ? html`<p class="ap-dossier__sum">${entry.summary}</p>` : ''}
      <dl class="ap-spec">
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
      ${stripe()}
    </header>
    <div class="ap-prose">${entry.html}</div>
    <footer class="ap-article__foot">
      ${entry.tags.length > 0 ? html`<div class="ap-article__tags"><span class="ap-label">${t('post.tags')}</span>${tagChips(ctx, entry.tags)}</div>` : ''}
      <nav class="ap-route" aria-label="${t('panel.route')}">
        ${entry.prev ? html`<a class="ap-route__btn ap-route__btn--prev" href="${url(entry.prev.url)}" rel="prev"><span class="ap-label">${t('post.prev')}</span><span class="ap-route__title">${entry.prev.title}</span></a>` : html`<span class="ap-route__btn ap-route__btn--void" aria-hidden="true"><span class="ap-label">— —</span></span>`}
        ${entry.next ? html`<a class="ap-route__btn ap-route__btn--next" href="${url(entry.next.url)}" rel="next"><span class="ap-label">${t('post.next')} ${icon('arrow')}</span><span class="ap-route__title">${entry.next.title}</span></a>` : html`<span class="ap-route__btn ap-route__btn--void" aria-hidden="true"><span class="ap-label">— —</span></span>`}
      </nav>
    </footer>
  </article>`

  const panel = html`${gauge()}${config.showToc ? checklist(ctx) : ''}${tagModule(ctx, t('panel.related'), entry.tags)}`
  const crumb = html`<a href="${url(`${langPrefix(ctx)}/archives/`)}">LOG</a><span class="ap-sep" aria-hidden="true">/</span><span aria-current="page">${code}</span>`
  return baseLayout(ctx, { body, panel, crumb, epoch: entry.date })
}
