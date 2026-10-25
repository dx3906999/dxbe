import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import {
  categoryModule,
  entryList,
  pad,
  recentModule,
  tagModule,
  uniqueCategories,
  uniqueTags,
} from './components.ts'

/** Profile home: an operator card printed at the head of the strip, then recent jobs. */
export const home: LayoutFn = (ctx) => {
  const item = ctx.pageItem
  const posts = ctx.posts ?? []
  const { site, i18n } = ctx
  const avatar = site.author.avatar
  const body = html`<article class="cp-article cp-profile"
      data-pagefind-body
      data-pagefind-filter="lang:${i18n.lang}"
      data-pagefind-meta="title:${item?.title ?? site.title}">
    <header class="cp-ticket">
      <dl class="cp-ticket__fields">
        <div><dt>OPERATOR</dt><dd>${site.author.name}</dd></div>
        <div><dt>JOBS</dt><dd>${pad(posts.length, 3)}</dd></div>
        ${site.social.map((link) => html`<div><dt>LINK</dt><dd><a href="${link.url}" rel="me noopener">${link.label}</a></dd></div>`)}
        <div><dt>${i18n.t('post.lang')}</dt><dd>${i18n.lang.toUpperCase()}</dd></div>
      </dl>
      <div class="cp-operator">
        ${avatar ? html`<img class="cp-operator__photo" src="${avatar}" alt="" width="104" height="104">` : ''}
        <div>
          <h1 class="cp-ticket__title">${item?.title ?? site.title}</h1>
          ${item?.summary ? html`<p class="cp-ticket__sum">${item.summary}</p>` : ''}
        </div>
      </div>
    </header>
    ${item ? html`<div class="cp-prose">${item.html}</div>` : ''}
  </article>
  ${
    posts.length > 0
      ? html`<section class="cp-recent">
    <p class="cp-head__run">
      <span>PROGRAM</span><span class="cp-head__prog">RECENT</span>
      <a class="cp-recent__all" href="${ctx.routes.posts}">${i18n.t('nav.posts')} ▸▸</a>
    </p>
    ${entryList(ctx, posts.slice(0, 3))}
  </section>`
      : ''
  }`
  const panel = html`${recentModule(ctx, posts)}${categoryModule(ctx, uniqueCategories(posts))}${tagModule(ctx, i18n.t('panel.tags'), uniqueTags(posts))}`
  return baseLayout(ctx, { body, panel, crumb: { current: 'PROFILE' } })
}
