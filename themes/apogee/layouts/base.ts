import {
  html,
  languageBootstrap,
  raw,
  type SafeHtml,
  type ThemeContext,
} from '../../../src/theme/api.ts'
import { getApogeeConfig } from '../config.ts'
import { icon, langPrefix, pad, stationCode } from './components.ts'

export interface BaseOptions {
  body: SafeHtml
  panel?: SafeHtml
  crumb?: SafeHtml
  /** Epoch for the mission clock; defaults to page render time of the newest post. */
  epoch?: string
}

const themeInit = `(() => {
  try {
    const v = localStorage.getItem('apogee.scheme');
    if (v === 'light' || v === 'dark') document.documentElement.dataset.scheme = v;
  } catch {}
  document.documentElement.classList.add('js');
})();`

/**
 * Latin-only webfonts (OFL, see assets/fonts/LICENSE-*); CJK falls through to the
 * system stack. Declared here rather than in site.css so the preload and the
 * @font-face share one hashed URL and the file is fetched once.
 */
function fonts(ctx: ThemeContext): SafeHtml {
  const url = (file: string) => ctx.helpers.asset(`fonts/${file}`)
  const range =
    'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
  const faces = [
    `@font-face{font-family:"Archivo";src:url("${url('archivo-latin-standard.woff2')}") format("woff2");font-weight:100 900;font-stretch:62% 125%;font-display:swap;unicode-range:${range}}`,
    `@font-face{font-family:"JetBrains Mono";src:url("${url('jetbrains-mono-latin-wght.woff2')}") format("woff2");font-weight:100 800;font-display:swap;unicode-range:${range}}`,
  ]
  return html`<link rel="preload" href="${url('archivo-latin-standard.woff2')}" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="${url('jetbrains-mono-latin-wght.woff2')}" as="font" type="font/woff2" crossorigin>
    <style>${raw(faces.join(''))}</style>`
}

function head(ctx: ThemeContext): SafeHtml {
  const { seo, assets, helpers } = ctx
  const alternates = seo.alternates.map(
    (alternate) =>
      html`<link rel="alternate" hreflang="${alternate.lang}" href="${helpers.absoluteUrl(alternate.url)}">`,
  )
  const feed = helpers.url(`${langPrefix(ctx)}/atom.xml`)
  return html`<meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${seo.title}</title>
    <meta name="description" content="${seo.description}">
    <link rel="canonical" href="${seo.canonical}">
    ${alternates}
    ${seo.alternates.length > 0 ? html`<link rel="alternate" hreflang="x-default" href="${seo.xDefault}">` : ''}
    ${seo.robots ? html`<meta name="robots" content="${seo.robots}">` : ''}
    <meta property="og:title" content="${seo.title}">
    <meta property="og:description" content="${seo.description}">
    <meta property="og:type" content="${seo.ogType}">
    <meta property="og:url" content="${seo.canonical}">
    <meta property="og:site_name" content="${ctx.site.title}">
    ${seo.image ? html`<meta property="og:image" content="${seo.image}">` : ''}
    ${seo.publishedTime ? html`<meta property="article:published_time" content="${seo.publishedTime}">` : ''}
    ${seo.modifiedTime ? html`<meta property="article:modified_time" content="${seo.modifiedTime}">` : ''}
    <meta name="theme-color" content="#ece8df" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#111316" media="(prefers-color-scheme: dark)">
    <link rel="alternate" type="application/atom+xml" title="${ctx.site.title}" href="${feed}">
    <script>${raw(themeInit)}</script>
    ${languageBootstrap(ctx)}
    ${fonts(ctx)}
    ${assets.themeCss ? html`<link rel="stylesheet" href="${assets.themeCss}">` : ''}
    ${assets.katexCss ? html`<link rel="stylesheet" href="${assets.katexCss}">` : ''}
    <script type="application/ld+json">${raw(seo.jsonLd)}</script>`
}

function rail(ctx: ThemeContext): SafeHtml {
  const { site, helpers, i18n } = ctx
  const config = getApogeeConfig(ctx)
  const home = helpers.url(`${langPrefix(ctx)}/`)
  const items = ctx.nav.map(
    (item, n) => html`<li>
        <a class="ap-nav__link" href="${item.url}"${item.current ? raw(' aria-current="page"') : ''}${item.external ? raw(' rel="noopener"') : ''}>
          <span class="ap-nav__idx">${pad(n + 1, 2)}</span>
          <span class="ap-nav__label">${item.label}</span>
          <span class="ap-nav__tick" aria-hidden="true"></span>
        </a>
      </li>`,
  )
  // Every language stays switchable; without a translation the link falls back to that language's home.
  const languages = site.languages.map((language) => {
    const alternate = i18n.alternates.find((entry) => entry.lang === language.code)
    const href = alternate ? helpers.url(alternate.url) : language.url
    const current = language.code === i18n.lang
    return html`<a class="ap-seg__opt" href="${href}" data-language="${language.code}" hreflang="${language.code}"${current ? raw(' aria-current="true"') : ''}>${language.code.toUpperCase()}</a>`
  })
  const socials = site.social.map(
    (link) => html`<a class="ap-chip" href="${link.url}" rel="me noopener">${link.label}</a>`,
  )
  const feed = helpers.url(`${langPrefix(ctx)}/atom.xml`)
  return html`<aside class="ap-rail" id="ap-rail" aria-label="${i18n.t('nav.label')}">
    <div class="ap-rail__inner">
      <div class="ap-ident">
        <p class="ap-label"><span class="ap-label__key">STA</span> ${stationCode(site.title)} <span class="ap-sep">/</span> ${i18n.label}</p>
        <a class="ap-ident__title" href="${home}">${site.title}</a>
        <p class="ap-ident__tag">${site.tagline}</p>
        <span class="ap-ident__plate" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span>
        </span>
      </div>
      <nav class="ap-nav" aria-label="${i18n.t('nav.label')}">
        <ol>${items}</ol>
      </nav>
      <div class="ap-rail__foot">
        ${
          config.missionClock
            ? html`<div class="ap-met" aria-hidden="true">
            <span class="ap-label">MET</span>
            <span class="ap-met__value" data-met>T+ 000:00:00:00</span>
          </div>`
            : ''
        }
        <div class="ap-controls">
          ${
            languages.length > 1
              ? html`<div class="ap-seg" role="group" aria-label="${i18n.t('language.switch')}">${languages}</div>`
              : ''
          }
          <button class="ap-switch" type="button" data-scheme-toggle aria-label="${i18n.t('theme.toggle')}">
            <span class="ap-switch__track"><span class="ap-switch__knob"></span></span>
            <span class="ap-switch__label" data-scheme-label>${i18n.t('theme.light')}</span>
          </button>
        </div>
        <div class="ap-links">
          ${socials}
          <a class="ap-chip" href="${feed}">${icon('rss')}<span>RSS</span></a>
        </div>
      </div>
    </div>
  </aside>`
}

function topbar(ctx: ThemeContext, crumb: SafeHtml | undefined): SafeHtml {
  const { helpers, i18n } = ctx
  const searchUrl = helpers.url(`${langPrefix(ctx)}/search/`)
  const home = helpers.url(`${langPrefix(ctx)}/`)
  return html`<header class="ap-top">
    <button class="ap-top__menu" type="button" data-rail-toggle aria-controls="ap-rail" aria-expanded="false" aria-label="${i18n.t('a11y.menu')}">
      <span></span><span></span><span></span>
    </button>
    <nav class="ap-crumb" aria-label="breadcrumb">
      <a href="${home}">SYS</a>
      <span class="ap-sep" aria-hidden="true">/</span>
      ${crumb ?? html`<span aria-current="page">${ctx.page.kind === 'index' ? 'LOG' : ctx.page.title}</span>`}
    </nav>
    ${
      ctx.assets.searchJs
        ? html`<form class="ap-query" action="${searchUrl}" method="get" role="search">
      <label class="ap-query__label" for="ap-q">QRY</label>
      <input id="ap-q" name="q" type="search" placeholder="${i18n.t('search.placeholder')}" autocomplete="off">
      <span class="ap-query__icon" aria-hidden="true">${icon('search')}</span>
    </form>`
        : ''
    }
    <div class="ap-progress" aria-hidden="true"><span data-progress></span></div>
  </header>`
}

function footer(ctx: ThemeContext): SafeHtml {
  const { site, i18n } = ctx
  const year = new Date().getFullYear()
  const repo = site.repository
    ? html`<a href="https://github.com/${site.repository.owner}/${site.repository.name}" rel="noopener">${i18n.t('footer.source')}</a>`
    : ''
  return html`<footer class="ap-foot">
    <div class="ap-stripe ap-stripe--thin" aria-hidden="true"></div>
    <div class="ap-foot__plate">
      <dl class="ap-foot__grid">
        <div><dt>OPR</dt><dd>${site.author.name}</dd></div>
        <div><dt>YR</dt><dd>${year}</dd></div>
        <div><dt>CODE</dt><dd>${site.license.code}</dd></div>
        <div><dt>TEXT</dt><dd>${site.license.content}</dd></div>
      </dl>
      <p class="ap-foot__note">
        <span>© ${year} ${site.author.name}</span>
        <span class="ap-sep" aria-hidden="true">·</span>
        <span>${i18n.t('footer.built')}</span>
        ${repo ? html`<span class="ap-sep" aria-hidden="true">·</span>${repo}` : ''}
      </p>
      <p class="ap-foot__serial" aria-hidden="true">SN-${pad(year, 4)}-${i18n.lang.toUpperCase()}-0001 <span>NO STEP</span></p>
    </div>
  </footer>`
}

export function baseLayout(ctx: ThemeContext, options: BaseOptions): SafeHtml {
  const epoch = options.epoch ?? ctx.posts?.[0]?.date ?? ctx.post?.date ?? ''
  const hasPanel = Boolean(options.panel)
  return html`<!doctype html>
<html lang="${ctx.i18n.lang}">
  <head>
    ${head(ctx)}
  </head>
  <body class="ap ap--${ctx.page.kind}${hasPanel ? ' ap--panel' : ''}" data-epoch="${epoch}">
    <a class="ap-skip" href="#main">${ctx.i18n.t('a11y.skip')}</a>
    <div class="ap-shell">
      ${rail(ctx)}
      <div class="ap-scrim" data-rail-close aria-hidden="true"></div>
      <div class="ap-stage">
        ${topbar(ctx, options.crumb)}
        <div class="ap-grid">
          <main id="main" class="ap-main" tabindex="-1">
            ${options.body}
          </main>
          ${hasPanel ? html`<aside class="ap-panel" aria-label="${ctx.i18n.t('panel.telemetry')}">${options.panel}</aside>` : ''}
        </div>
        ${footer(ctx)}
      </div>
    </div>
    ${ctx.assets.themeJs ? html`<script type="module" src="${ctx.assets.themeJs}"></script>` : ''}
    ${ctx.page.kind === 'search' && ctx.assets.searchJs ? html`<script src="${ctx.assets.searchJs}" defer></script>` : ''}
  </body>
</html>`
}
