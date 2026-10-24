import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { archiveRows, langPrefix, pad, placard } from './components.ts'

export const archive: LayoutFn = (ctx) => {
  const groups = ctx.archives ?? []
  const total = groups.reduce((sum, group) => sum + group.posts.length, 0)
  const url = ctx.helpers.url
  const body = html`${placard({
    label: 'SECTION 02 · MANIFEST',
    title: ctx.page.title,
    count: `${pad(total, 3)} ${ctx.i18n.t('page.postsUnit')}`,
  })}
  <div class="ap-manifest">${groups.map(
    (group) => html`<section class="ap-year" data-reveal>
      <h2 class="ap-year__head">
        <a href="${url(`${langPrefix(ctx)}/archives/${group.year}/`)}">${group.year}</a>
        <span class="ap-label ap-label--dim">${pad(group.posts.length, 2)} ${ctx.i18n.t('page.postsUnit')}</span>
      </h2>
      ${archiveRows(ctx, group.posts)}
    </section>`,
  )}</div>`
  // a year page is an archive task that carries its own post list
  const crumb = ctx.posts
    ? html`<a href="${url(`${langPrefix(ctx)}/archives/`)}">LOG</a><span class="ap-sep" aria-hidden="true">/</span><span aria-current="page">${ctx.page.title}</span>`
    : undefined
  return baseLayout(ctx, { body, crumb })
}
