import { html, type LayoutFn } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { jobCode, langPrefix, pad, printHead, stamp } from './components.ts'

export const archive: LayoutFn = (ctx) => {
  const groups = ctx.archives ?? []
  const total = groups.reduce((sum, group) => sum + group.posts.length, 0)
  const url = ctx.helpers.url
  const body = html`${printHead({
    program: 'ARCHIVE',
    title: ctx.page.title,
    count: `${pad(total, 3)} ${ctx.i18n.t('page.postsUnit')}`,
  })}
  ${groups.map(
    (group) => html`<section class="cp-year">
      <h2 class="cp-year__head">
        <a href="${url(`${langPrefix(ctx)}/archives/${group.year}/`)}">${group.year}</a>
        <span class="cp-year__count">${pad(group.posts.length, 2)} ${ctx.i18n.t('page.postsUnit')}</span>
      </h2>
      <ol class="cp-log">${group.posts.map(
        (post) => html`<li>
          <time datetime="${post.date}">${stamp(ctx, post.date).slice(5)}</time>
          <span class="cp-log__code">${jobCode(ctx, post.date)}</span>
          <a href="${ctx.helpers.postUrl(post)}">${post.title}</a>
        </li>`,
      )}</ol>
    </section>`,
  )}`
  const crumb = ctx.posts
    ? {
        parent: { label: 'ARCHIVE', url: url(`${langPrefix(ctx)}/archives/`) },
        current: ctx.page.title,
      }
    : undefined
  return baseLayout(ctx, { body, crumb })
}
