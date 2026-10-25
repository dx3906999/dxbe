import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import {
  categoryModule,
  icon,
  pad,
  postCard,
  recentModule,
  stationCode,
  stripe,
  tagModule,
  uniqueCategories,
  uniqueTags,
} from './components.ts'

/** Profile home: a crew file for the author, then the latest log entries. */
export const home: LayoutFn = (ctx) => {
  const item = ctx.pageItem
  const posts = ctx.posts ?? []
  const { site, i18n } = ctx
  const latest = posts.slice(0, 3)
  const avatar = site.author.avatar
  const body = html`<article class="ap-article ap-profile"
      data-pagefind-body
      data-pagefind-filter="lang:${i18n.lang}"
      data-pagefind-meta="title:${item?.title ?? site.title}">
    <header class="ap-dossier ap-dossier--crew" data-reveal>
      <div class="ap-dossier__bar">
        <span class="ap-label"><span class="ap-label__key">CREW</span> FILE ${stationCode(site.author.name)}</span>
        <span class="ap-label ap-label--dim">${i18n.label}</span>
        <span class="ap-hazard" aria-hidden="true"></span>
      </div>
      <div class="ap-crew">
        ${
          avatar
            ? html`<figure class="ap-crew__photo"><img src="${avatar}" alt="" width="120" height="120"><figcaption>OPR · ${site.author.name}</figcaption></figure>`
            : ''
        }
        <div class="ap-crew__id">
          <h1 class="ap-dossier__title">${item?.title ?? site.title}</h1>
          ${item?.summary ? html`<p class="ap-dossier__sum">${item.summary}</p>` : ''}
        </div>
      </div>
      <dl class="ap-spec">
        <div><dt>OPR</dt><dd>${site.author.name}</dd></div>
        <div><dt>LOG</dt><dd>${pad(posts.length, 3)}</dd></div>
        ${site.social.map((link) => html`<div><dt>LINK</dt><dd><a href="${link.url}" rel="me noopener">${link.label}</a></dd></div>`)}
      </dl>
      ${stripe()}
    </header>
    ${item ? html`<div class="ap-prose">${item.html}</div>` : ''}
  </article>
  ${
    latest.length > 0
      ? html`<section class="ap-latest">
    <header class="ap-latest__head">
      <h2 class="ap-label"><span class="ap-label__key">LATEST</span> LOG</h2>
      <a class="ap-btn" href="${ctx.routes.posts}">${i18n.t('nav.posts')} ${icon('arrow')}</a>
    </header>
    <div class="ap-cards">${latest.map((post, n) => postCard(ctx, post, n))}</div>
  </section>`
      : ''
  }`
  const panel = html`${recentModule(ctx, posts)}${categoryModule(ctx, uniqueCategories(posts))}${tagModule(ctx, i18n.t('panel.tags'), uniqueTags(posts))}`
  const crumb = html`<span aria-current="page">CREW</span>`
  return baseLayout(ctx, { body, panel, crumb })
}
