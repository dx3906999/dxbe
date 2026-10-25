import {
  html,
  type Post,
  raw,
  type SafeHtml,
  type TagView,
  type ThemeContext,
} from '../../../src/theme/api.ts'
import { getCapstanConfig } from '../config.ts'

export function pad(value: number, width: number): string {
  return String(value).padStart(width, '0')
}

export function langPrefix(ctx: ThemeContext): string {
  return ctx.i18n.lang === ctx.site.defaultLang ? '' : `/${ctx.i18n.lang}`
}

/** Job number "YY.DDD" from an ISO date. */
export function jobCode(ctx: ThemeContext, value: string): string {
  const iso = ctx.helpers.isoDate(value)
  const [year, month, day] = iso.split('-').map(Number)
  const start = Date.UTC(year ?? 1970, 0, 1)
  const current = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)
  const ordinal = Math.round((current - start) / 86_400_000) + 1
  return `${String(year).slice(-2)}.${pad(ordinal, 3)}`
}

export function stamp(ctx: ThemeContext, value: string): string {
  return ctx.helpers.isoDate(value).replaceAll('-', '.')
}

const icons: Record<string, string> = {
  rss: '<svg viewBox="0 0 16 16" width="11" height="11"><path d="M3 3a10 10 0 0 1 10 10M3 7a6 6 0 0 1 6 6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/></svg>',
}

export function icon(name: string): SafeHtml {
  return raw(icons[name] ?? '')
}

/** A recessed CRT module. Content inside is phosphor text. */
export function screen(content: SafeHtml, modifier = ''): SafeHtml {
  return html`<div class="cp-crt${modifier ? ` cp-crt--${modifier}` : ''}">
    <div class="cp-crt__glass">${content}</div>
  </div>`
}

export function printHead(options: {
  program: string
  title: string
  lede?: string
  count?: string
}): SafeHtml {
  return html`<header class="cp-head">
    <p class="cp-head__run">
      <span>PROGRAM</span><span class="cp-head__prog">${options.program}</span>
      ${options.count ? html`<span class="cp-head__count">${options.count}</span>` : ''}
    </p>
    <h1 class="cp-head__title">${options.title}</h1>
    ${options.lede ? html`<p class="cp-head__lede">${options.lede}</p>` : ''}
  </header>`
}

export function tagKeys(ctx: ThemeContext, tags: string[]): SafeHtml {
  if (tags.length === 0) return raw('')
  return html`<ul class="cp-tags">${tags.map(
    (name) => html`<li><a class="cp-tag" href="${ctx.helpers.tagUrlByName(name)}">${name}</a></li>`,
  )}</ul>`
}

export function entry(ctx: ThemeContext, post: Post): SafeHtml {
  const config = getCapstanConfig(ctx)
  return html`<article class="cp-entry">
    <div class="cp-entry__line">
      <span class="cp-entry__code">${jobCode(ctx, post.date)}</span>
      <h2 class="cp-entry__title"><a href="${ctx.helpers.postUrl(post)}">${post.title}</a></h2>
      <span class="cp-entry__lead" aria-hidden="true"></span>
      ${config.showReadingTime ? html`<span class="cp-entry__len">${pad(post.readingMinutes, 2)} ${ctx.i18n.t('post.minutes')}</span>` : ''}
    </div>
    ${post.summary ? html`<p class="cp-entry__sum">${post.summary}</p>` : ''}
    <div class="cp-entry__meta">
      <time datetime="${post.date}">${stamp(ctx, post.date)}</time>
      ${tagKeys(ctx, post.tags)}
    </div>
  </article>`
}

export function entryList(ctx: ThemeContext, posts: Post[]): SafeHtml {
  if (posts.length === 0) return html`<p class="cp-empty">${ctx.i18n.t('post.empty')}</p>`
  return html`<div class="cp-entries">${posts.map((post) => entry(ctx, post))}</div>`
}

export function pagination(ctx: ThemeContext): SafeHtml {
  const p = ctx.pagination
  if (!p || p.total <= 1) return raw('')
  const t = ctx.i18n.t
  const url = ctx.helpers.url
  return html`<nav class="cp-pager" aria-label="${t('paginator.label')}">
    ${p.prevUrl ? html`<a class="cp-btn" href="${url(p.prevUrl)}" rel="prev">◂ ${t('paginator.prev')}</a>` : html`<span class="cp-btn" aria-disabled="true">◂ ${t('paginator.prev')}</span>`}
    <ol class="cp-pager__pages">${p.pages.map(
      (page) =>
        html`<li><a href="${url(page.url)}"${page.n === p.current ? raw(' aria-current="page"') : ''}>${pad(page.n, 2)}</a></li>`,
    )}</ol>
    ${p.nextUrl ? html`<a class="cp-btn" href="${url(p.nextUrl)}" rel="next">${t('paginator.next')} ▸</a>` : html`<span class="cp-btn" aria-disabled="true">${t('paginator.next')} ▸</span>`}
  </nav>`
}

/** Table of contents on a CRT, numbered to match the prose counters. */
export function monitorToc(ctx: ThemeContext): SafeHtml {
  const entries = ctx.toc.filter((item) => item.depth <= 3)
  if (entries.length === 0) return raw('')
  const top = Math.min(...entries.map((item) => item.depth))
  let major = 0
  let minor = 0
  const items = entries.map((item) => {
    const level = item.depth - top
    if (level === 0) {
      major += 1
      minor = 0
    } else {
      minor += 1
    }
    const number = level === 0 ? pad(major, 2) : `${pad(major, 2)}.${minor}`
    return html`<li data-level="${level}"><a href="#${item.id}" data-toc="${item.id}"><span class="cp-toc__no">${number}</span><span class="cp-toc__text">${item.text}</span></a></li>`
  })
  return html`<section class="cp-module">
    <h2 class="cp-engrave cp-module__head"><span>${ctx.i18n.t('toc.title')}</span><span>${pad(entries.length, 2)}</span></h2>
    ${screen(html`<ol class="cp-toc">${items}</ol>`, 'toc')}
  </section>`
}

export function levelMeter(ctx: ThemeContext): SafeHtml {
  const segments = Array.from({ length: 16 }, (_, n) => html`<i style="--n:${n}"></i>`)
  return html`<section class="cp-module" aria-hidden="true">
    <h2 class="cp-engrave cp-module__head"><span>${ctx.i18n.t('panel.level')}</span><span data-level-text>000</span></h2>
    <div class="cp-meter" data-level>${segments}</div>
    <div class="cp-meter__scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
  </section>`
}

export function recentModule(ctx: ThemeContext, posts: Post[]): SafeHtml {
  if (posts.length === 0) return raw('')
  return html`<section class="cp-module">
    <h2 class="cp-engrave cp-module__head"><span>${ctx.i18n.t('panel.recent')}</span><span>${pad(posts.length, 2)}</span></h2>
    ${screen(
      html`<ol class="cp-toc cp-toc--recent">${posts
        .slice(0, 5)
        .map(
          (post) =>
            html`<li><a href="${ctx.helpers.postUrl(post)}"><span class="cp-toc__no">${jobCode(ctx, post.date)}</span><span class="cp-toc__text">${post.title}</span></a></li>`,
        )}</ol>`,
      'toc',
    )}
  </section>`
}

export function tagModule(ctx: ThemeContext, label: string, names: string[]): SafeHtml {
  if (names.length === 0) return raw('')
  return html`<section class="cp-module">
    <h2 class="cp-engrave cp-module__head"><span>${label}</span><span>${pad(names.length, 2)}</span></h2>
    ${tagKeys(ctx, names)}
  </section>`
}

export function uniqueTags(posts: Post[]): string[] {
  const counts = new Map<string, number>()
  for (const post of posts) {
    for (const name of post.tags) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
}

/** Printed bar chart of counts; used for tags and categories. */
export function chart(
  items: TagView[],
  urlFor: (item: TagView) => string,
  empty: string,
): SafeHtml {
  const list = [...items].sort((a, b) => b.count - a.count)
  if (list.length === 0) return html`<p class="cp-empty">${empty}</p>`
  const max = Math.max(1, ...list.map((item) => item.count))
  return html`<ul class="cp-chart">${list.map(
    (item) => html`<li style="--w:${(item.count / max).toFixed(3)}">
      <a href="${urlFor(item)}">
        <span class="cp-chart__name">${item.name}</span>
        <span class="cp-chart__bar" aria-hidden="true"></span>
        <span class="cp-chart__count">${pad(item.count, 2)}</span>
      </a>
    </li>`,
  )}</ul>`
}

export function categoryModule(ctx: ThemeContext, names: string[]): SafeHtml {
  if (names.length === 0) return raw('')
  return html`<section class="cp-module">
    <h2 class="cp-engrave cp-module__head"><span>${ctx.i18n.t('page.categories')}</span><span>${pad(names.length, 2)}</span></h2>
    ${screen(
      html`<ol class="cp-toc">${names.map(
        (name, n) =>
          html`<li><a href="${ctx.helpers.categoryUrlByName(name)}"><span class="cp-toc__no">CH-${pad(n + 1, 2)}</span><span class="cp-toc__text">${name}</span></a></li>`,
      )}</ol>`,
      'toc',
    )}
  </section>`
}

export function uniqueCategories(posts: Post[]): string[] {
  const counts = new Map<string, number>()
  for (const post of posts) {
    for (const name of post.categories) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
}
