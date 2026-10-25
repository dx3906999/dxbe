import {
  html,
  type Post,
  raw,
  type SafeHtml,
  type TagView,
  type ThemeContext,
} from '../../../src/theme/api.ts'
import { getApogeeConfig } from '../config.ts'

export function pad(value: number, width: number): string {
  return String(value).padStart(width, '0')
}

export function langPrefix(ctx: ThemeContext): string {
  return ctx.i18n.lang === ctx.site.defaultLang ? '' : `/${ctx.i18n.lang}`
}

/** Stable four-digit station number derived from a string. */
export function stationCode(value: string): string {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return pad((hash >>> 0) % 10000, 4)
}

/** Mission designation "YY.DDD" from an ISO date. */
export function missionCode(ctx: ThemeContext, value: string): string {
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
  search:
    '<svg viewBox="0 0 16 16" width="14" height="14"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5 14 14" stroke="currentColor" stroke-width="1.5"/></svg>',
  rss: '<svg viewBox="0 0 16 16" width="12" height="12"><path d="M3 3a10 10 0 0 1 10 10M3 7a6 6 0 0 1 6 6" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="4" cy="12" r="1.4" fill="currentColor"/></svg>',
  arrow:
    '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
}

export function icon(name: keyof typeof icons | string): SafeHtml {
  return raw(icons[name] ?? '')
}

export function stripe(modifier = ''): SafeHtml {
  return html`<div class="ap-stripe${modifier ? ` ap-stripe--${modifier}` : ''}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>`
}

const orbitPath = 'M14 64a96 34 0 1 0 192 0a96 34 0 1 0-192 0'

/** Small orbital schematic for the home placard: two dashed orbits and a craft riding one. */
export function orbit(): SafeHtml {
  return raw(`<svg class="ap-orbit" viewBox="0 0 220 128" aria-hidden="true">
  <path d="M110 4v120M2 64h216" class="ap-orbit__axis"/>
  <path d="${orbitPath}" class="ap-orbit__path"/>
  <ellipse cx="110" cy="64" rx="58" ry="46" transform="rotate(-24 110 64)" class="ap-orbit__path ap-orbit__path--alt"/>
  <circle cx="110" cy="64" r="13" class="ap-orbit__body"/>
  <path d="M97 64a13 13 0 0 0 26 0" class="ap-orbit__shade"/>
  <circle r="3.2" class="ap-orbit__craft"><animateMotion dur="16s" repeatCount="indefinite" path="${orbitPath}"/></circle>
  <text x="206" y="58" text-anchor="end">AP 412</text>
  <text x="14" y="84">PE 288</text>
  <text x="114" y="12">i 51.6°</text>
</svg>`)
}

export function placard(options: {
  label: string
  title: string
  lede?: string
  count?: string
  schematic?: boolean
}): SafeHtml {
  return html`<header class="ap-placard${options.schematic ? ' ap-placard--hero' : ''}" data-reveal>
    ${options.schematic ? orbit() : ''}
    <div class="ap-placard__head">
      <p class="ap-label">${options.label}</p>
      ${options.count ? html`<p class="ap-label ap-label--dim">${options.count}</p>` : ''}
    </div>
    <h1 class="ap-placard__title">${options.title}</h1>
    ${options.lede ? html`<p class="ap-placard__lede">${options.lede}</p>` : ''}
    ${stripe()}
  </header>`
}

export function tagChips(ctx: ThemeContext, tags: string[]): SafeHtml {
  if (tags.length === 0) return raw('')
  return html`<ul class="ap-tags">${tags.map(
    (name) => html`<li><a class="ap-tag" href="${ctx.helpers.tagUrlByName(name)}">${name}</a></li>`,
  )}</ul>`
}

export function postCard(ctx: ThemeContext, post: Post, index: number): SafeHtml {
  const config = getApogeeConfig(ctx)
  // archive lists stay compact
  const cover = ctx.page.kind === 'archive' ? undefined : post.cover
  return html`<article class="ap-card${cover ? ' ap-card--cover' : ''}" data-reveal style="--i:${index}">
    <div class="ap-card__rail">
      <span class="ap-card__no"><span class="ap-label__key">LOG</span> ${missionCode(ctx, post.date)}</span>
      <time datetime="${post.date}">${stamp(ctx, post.date)}</time>
    </div>
    ${cover ? html`<div class="ap-card__cover" aria-hidden="true" style="--cover:url('${ctx.helpers.url(cover.url)}')"><img src="${ctx.helpers.url(cover.url)}" alt="" loading="lazy" decoding="async"></div>` : ''}
    <div class="ap-card__body">
      <h2 class="ap-card__title"><a href="${ctx.helpers.postUrl(post)}">${post.title}</a></h2>
      ${post.summary ? html`<p class="ap-card__sum">${post.summary}</p>` : ''}
      <div class="ap-card__meta">
        ${config.showReadingTime ? html`<span class="ap-card__read">${pad(post.readingMinutes, 2)} ${ctx.i18n.t('post.minutes')}</span>` : ''}
        ${tagChips(ctx, post.tags)}
      </div>
    </div>
    <span class="ap-card__go" aria-hidden="true">${icon('arrow')}</span>
  </article>`
}

export function postList(ctx: ThemeContext, posts: Post[]): SafeHtml {
  if (posts.length === 0) {
    return html`<p class="ap-empty">${ctx.i18n.t('post.empty')}</p>`
  }
  return html`<div class="ap-cards">${posts.map((post, n) => postCard(ctx, post, n))}</div>`
}

export function pagination(ctx: ThemeContext): SafeHtml {
  const p = ctx.pagination
  if (!p || p.total <= 1) return raw('')
  const { t, url } = { t: ctx.i18n.t, url: ctx.helpers.url }
  return html`<nav class="ap-pager" aria-label="${t('paginator.label')}">
    ${p.prevUrl ? html`<a class="ap-btn" href="${url(p.prevUrl)}" rel="prev">${t('paginator.prev')}</a>` : html`<span class="ap-btn" aria-disabled="true">${t('paginator.prev')}</span>`}
    <ol class="ap-pager__pages">${p.pages.map(
      (page) =>
        html`<li><a href="${url(page.url)}"${page.n === p.current ? raw(' aria-current="page"') : ''}>${pad(page.n, 2)}</a></li>`,
    )}</ol>
    ${p.nextUrl ? html`<a class="ap-btn" href="${url(p.nextUrl)}" rel="next">${t('paginator.next')}</a>` : html`<span class="ap-btn" aria-disabled="true">${t('paginator.next')}</span>`}
  </nav>`
}

/** Checklist-style table of contents, numbered to match the prose counters. */
export function checklist(ctx: ThemeContext): SafeHtml {
  const entries = ctx.toc.filter((entry) => entry.depth <= 3)
  if (entries.length === 0) return raw('')
  const top = Math.min(...entries.map((entry) => entry.depth))
  let major = 0
  let minor = 0
  const items = entries.map((entry) => {
    const level = entry.depth - top
    if (level === 0) {
      major += 1
      minor = 0
    } else {
      minor += 1
    }
    const number = level === 0 ? pad(major, 2) : `${pad(major, 2)}.${minor}`
    return html`<li class="ap-check__item" data-level="${level}">
      <a href="#${entry.id}" data-toc="${entry.id}">
        <span class="ap-check__box" aria-hidden="true"></span>
        <span class="ap-check__no">${number}</span>
        <span class="ap-check__text">${entry.text}</span>
      </a>
    </li>`
  })
  return html`<section class="ap-module">
    <h2 class="ap-module__head"><span>${ctx.i18n.t('toc.title')}</span><span class="ap-module__count">${pad(entries.length, 2)}</span></h2>
    <ol class="ap-check">${items}</ol>
  </section>`
}

export function recentModule(ctx: ThemeContext, posts: Post[]): SafeHtml {
  if (posts.length === 0) return raw('')
  return html`<section class="ap-module">
    <h2 class="ap-module__head"><span>${ctx.i18n.t('panel.recent')}</span><span class="ap-module__count">${pad(posts.length, 2)}</span></h2>
    <ol class="ap-recent">${posts.slice(0, 5).map(
      (post) => html`<li>
        <a href="${ctx.helpers.postUrl(post)}">
          <span class="ap-recent__code">${missionCode(ctx, post.date)}</span>
          <span class="ap-recent__title">${post.title}</span>
        </a>
      </li>`,
    )}</ol>
  </section>`
}

export function tagModule(ctx: ThemeContext, label: string, names: string[]): SafeHtml {
  if (names.length === 0) return raw('')
  return html`<section class="ap-module">
    <h2 class="ap-module__head"><span>${label}</span><span class="ap-module__count">${pad(names.length, 2)}</span></h2>
    ${tagChips(ctx, names)}
  </section>`
}

export function gauge(): SafeHtml {
  return html`<section class="ap-module ap-module--gauge" aria-hidden="true">
    <div class="ap-gauge">
      <div class="ap-gauge__head">
        <span class="ap-label">ALT</span>
        <span class="ap-gauge__value"><span data-progress-text>000</span><small>%</small></span>
        <span class="ap-gauge__sec" data-gauge-sec></span>
      </div>
      <div class="ap-gauge__track" data-progress-v>
        <span class="ap-gauge__fill"></span>
        <span class="ap-gauge__mark"></span>
      </div>
      <div class="ap-gauge__scale">${[0, 25, 50, 75, 100].map((n) => html`<span style="--at:${n}%">${n}</span>`)}</div>
    </div>
  </section>`
}

export function uniqueTags(posts: Post[]): string[] {
  const counts = new Map<string, number>()
  for (const post of posts) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
}

export function archiveRows(ctx: ThemeContext, posts: Post[]): SafeHtml {
  return html`<ol class="ap-ledger">${posts.map(
    (post) => html`<li class="ap-ledger__row">
      <time datetime="${post.date}">${stamp(ctx, post.date).slice(5)}</time>
      <span class="ap-ledger__code">${missionCode(ctx, post.date)}</span>
      <a href="${ctx.helpers.postUrl(post)}">${post.title}</a>
    </li>`,
  )}</ol>`
}

/** Indexed cells with a bar proportional to the count; used for tags and categories. */
export function bank(items: TagView[], urlFor: (item: TagView) => string, empty: string): SafeHtml {
  const list = [...items].sort((a, b) => b.count - a.count)
  if (list.length === 0) return html`<p class="ap-empty">${empty}</p>`
  const max = Math.max(1, ...list.map((entry) => entry.count))
  return html`<ul class="ap-bank">${list.map(
    (entry, n) => html`<li data-reveal style="--i:${n};--w:${(entry.count / max).toFixed(3)}">
      <a class="ap-bank__cell" href="${urlFor(entry)}">
        <span class="ap-bank__no">${pad(n + 1, 2)}</span>
        <span class="ap-bank__name">${entry.name}</span>
        <span class="ap-bank__count">${pad(entry.count, 2)}</span>
        <span class="ap-bank__bar" aria-hidden="true"></span>
      </a>
    </li>`,
  )}</ul>`
}

export function categoryModule(ctx: ThemeContext, names: string[]): SafeHtml {
  if (names.length === 0) return raw('')
  return html`<section class="ap-module">
    <h2 class="ap-module__head"><span>${ctx.i18n.t('page.categories')}</span><span class="ap-module__count">${pad(names.length, 2)}</span></h2>
    <ul class="ap-cats">${names.map(
      (name) =>
        html`<li><a href="${ctx.helpers.categoryUrlByName(name)}"><span class="ap-cats__mark" aria-hidden="true"></span>${name}</a></li>`,
    )}</ul>
  </section>`
}

export function uniqueCategories(posts: Post[]): string[] {
  const counts = new Map<string, number>()
  for (const post of posts) {
    for (const name of post.categories) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
}
