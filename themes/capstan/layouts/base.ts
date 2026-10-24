import {
  html,
  languageBootstrap,
  raw,
  type SafeHtml,
  type ThemeContext,
} from '../../../src/theme/api.ts'
import { getCapstanConfig } from '../config.ts'
import { icon, langPrefix, pad, screen } from './components.ts'

export interface BaseOptions {
  body: SafeHtml
  panel?: SafeHtml
  /** Readout path; `parent` becomes a link one level up. */
  crumb?: Crumb
}

export interface Crumb {
  parent?: { label: string; url: string }
  current: string
}

const themeInit = `(() => {
  try {
    const v = localStorage.getItem('capstan.scheme');
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
    `@font-face{font-family:"Chakra Petch";src:url("${url('chakra-petch-latin-500.woff2')}") format("woff2");font-weight:500;font-display:swap;unicode-range:${range}}`,
    `@font-face{font-family:"Chakra Petch";src:url("${url('chakra-petch-latin-600.woff2')}") format("woff2");font-weight:600;font-display:swap;unicode-range:${range}}`,
    `@font-face{font-family:"Chakra Petch";src:url("${url('chakra-petch-latin-700.woff2')}") format("woff2");font-weight:700;font-display:swap;unicode-range:${range}}`,
  ]
  return html`<link rel="preload" href="${url('chakra-petch-latin-700.woff2')}" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="${url('chakra-petch-latin-500.woff2')}" as="font" type="font/woff2" crossorigin>
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
    <meta name="theme-color" content="#cbc3b0" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#1c1b18" media="(prefers-color-scheme: dark)">
    <link rel="alternate" type="application/atom+xml" title="${ctx.site.title}" href="${feed}">
    <script>${raw(themeInit)}</script>
    ${languageBootstrap(ctx)}
    ${fonts(ctx)}
    ${assets.themeCss ? html`<link rel="stylesheet" href="${assets.themeCss}">` : ''}
    ${assets.katexCss ? html`<link rel="stylesheet" href="${assets.katexCss}">` : ''}
    <script type="application/ld+json">${raw(seo.jsonLd)}</script>`
}

function deck(ctx: ThemeContext): SafeHtml {
  const { site, helpers, i18n } = ctx
  const home = helpers.url(`${langPrefix(ctx)}/`)
  const keys = ctx.nav.map((item, n) => {
    // English legend under the label; a key number when the label is already that word
    const legend = item.key.toUpperCase()
    const sub = item.label.toUpperCase() === legend ? `KEY ${pad(n + 1, 2)}` : legend
    return html`<li>
      <a class="cp-key" href="${item.url}"${item.current ? raw(' aria-current="page"') : ''}${item.external ? raw(' rel="noopener"') : ''}>
        <span class="cp-key__label">${item.label}</span>
        <span class="cp-key__sub" aria-hidden="true">${sub}</span>
      </a>
    </li>`
  })
  const languages = site.languages.map((language) => {
    const alternate = i18n.alternates.find((entry) => entry.lang === language.code)
    const href = alternate ? helpers.url(alternate.url) : language.url
    const current = language.code === i18n.lang
    return html`<a class="cp-key cp-key--mini" href="${href}" data-language="${language.code}" hreflang="${language.code}"${current ? raw(' aria-current="true"') : ''}><span class="cp-key__label">${language.code.toUpperCase()}</span><span class="cp-key__sub" aria-hidden="true">${language.label}</span></a>`
  })
  const socials = site.social.map(
    (link) => html`<a class="cp-jack" href="${link.url}" rel="me noopener">${link.label}</a>`,
  )
  const ident = html`<p class="cp-crt__sys">CH-01 <span>▸</span> READY</p>
    <a class="cp-ident__title" href="${home}">${site.title}</a>
    <p class="cp-ident__tag">${site.tagline}<span class="cp-caret" aria-hidden="true"></span></p>`

  return html`<aside class="cp-deck" id="cp-deck" aria-label="${i18n.t('nav.label')}">
    <div class="cp-deck__inner">
      <div class="cp-grille" aria-hidden="true"></div>
      ${screen(ident, 'ident')}
      <nav class="cp-keybed" aria-label="${i18n.t('nav.label')}">
        <ul>${keys}</ul>
      </nav>
      ${dial()}
      <div class="cp-deck__foot">
        ${
          languages.length > 1
            ? html`<div class="cp-row">
          <span class="cp-engrave">${i18n.t('language.switch')}</span>
          <div class="cp-keyrow" role="group" aria-label="${i18n.t('language.switch')}">${languages}</div>
        </div>`
            : ''
        }
        <div class="cp-row">
          <span class="cp-engrave">DISPLAY</span>
          <button class="cp-toggle" type="button" data-scheme-toggle aria-label="${i18n.t('theme.toggle')}">
            <span class="cp-toggle__label">${i18n.t('theme.light')}</span>
            <span class="cp-toggle__well" aria-hidden="true"><span class="cp-toggle__bat"></span></span>
            <span class="cp-toggle__label">${i18n.t('theme.dark')}</span>
          </button>
        </div>
        <div class="cp-row cp-row--jacks">
          ${socials}
          <a class="cp-jack" href="${helpers.url(`${langPrefix(ctx)}/atom.xml`)}">${icon('rss')}RSS</a>
        </div>
      </div>
      <span class="cp-screw cp-screw--tl" aria-hidden="true"></span>
      <span class="cp-screw cp-screw--tr" aria-hidden="true"></span>
      <span class="cp-screw cp-screw--bl" aria-hidden="true"></span>
      <span class="cp-screw cp-screw--br" aria-hidden="true"></span>
    </div>
  </aside>`
}

/** Moving-coil meter; site.js swings the needle with scroll speed. */
function dial(): SafeHtml {
  const ticks = Array.from({ length: 21 }, (_, n) => {
    const angle = -50 + n * 5
    const major = n % 5 === 0
    return `<line x1="70" y1="${major ? 14 : 18}" x2="70" y2="24" transform="rotate(${angle} 70 78)"${n >= 16 ? ' class="hot"' : ''}${major ? ' stroke-width="1.4"' : ''}/>`
  }).join('')
  return html`<div class="cp-dial" aria-hidden="true">
    <div class="cp-dial__face">
      ${raw(`<svg viewBox="0 0 140 84"><path d="M28.6 43.3A54 54 0 0 1 111.4 43.3" class="cp-dial__arc"/><path d="M97 31.2A54 54 0 0 1 111.4 43.3" class="cp-dial__arc hot"/>${ticks}<text x="20" y="66">0</text><text x="120" y="66" text-anchor="end" class="hot">+</text><text x="70" y="50" text-anchor="middle" class="cp-dial__unit">VU</text></svg>`)}
      <span class="cp-dial__needle" data-needle></span>
      <span class="cp-dial__pivot"></span>
    </div>
    <span class="cp-engrave">SIGNAL</span>
  </div>`
}

function counter(): SafeHtml {
  const digit = html`<span class="cp-digit"><span class="cp-digit__reel">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => html`<span>${n}</span>`)}</span></span>`
  return html`<div class="cp-counter" aria-hidden="true">
    <span class="cp-counter__label">POS</span>
    <span class="cp-counter__window" data-counter>${digit}${digit}${digit}${digit}</span>
  </div>`
}

function topbar(ctx: ThemeContext, crumb: Crumb | undefined): SafeHtml {
  const { helpers, i18n } = ctx
  const searchUrl = helpers.url(`${langPrefix(ctx)}/search/`)
  const home = helpers.url(`${langPrefix(ctx)}/`)
  const current = crumb?.current ?? (ctx.page.kind === 'index' ? 'INDEX' : ctx.page.title)
  const sep = html`<span class="cp-readout__sep" aria-hidden="true">/</span>`
  return html`<header class="cp-top">
    <button class="cp-top__menu" type="button" data-deck-toggle aria-controls="cp-deck" aria-expanded="false" aria-label="${i18n.t('a11y.menu')}">
      <span></span><span></span><span></span>
    </button>
    <div class="cp-readout">
      <div class="cp-readout__glass">
        <span class="cp-readout__prompt" aria-hidden="true">&gt;</span>
        <nav class="cp-readout__path" aria-label="breadcrumb">
          <a href="${home}">SYS</a>${sep}${
            crumb?.parent ? html`<a href="${crumb.parent.url}">${crumb.parent.label}</a>${sep}` : ''
          }<span aria-current="page">${current}</span>
        </nav><span class="cp-caret" aria-hidden="true"></span>
      </div>
    </div>
    ${counter()}
    ${
      ctx.assets.searchJs
        ? html`<form class="cp-query" action="${searchUrl}" method="get" role="search">
      <label class="cp-engrave" for="cp-q">SEEK</label>
      <span class="cp-query__well"><input id="cp-q" name="q" type="search" placeholder="${i18n.t('search.placeholder')}" autocomplete="off"></span>
    </form>`
        : ''
    }
  </header>`
}

function roller(position: 'top' | 'bottom'): SafeHtml {
  return html`<div class="cp-roller cp-roller--${position}" aria-hidden="true">
    <span class="cp-roller__mount"></span>
    <span class="cp-roller__drum">
      <span class="cp-roller__knurl" data-knurl></span>
      <span class="cp-roller__wrap"><span class="cp-roller__feed" data-feed="${position}"></span></span>
    </span>
    <span class="cp-roller__mount"></span>
  </div>`
}

function footer(ctx: ThemeContext): SafeHtml {
  const { site, i18n } = ctx
  const year = new Date().getFullYear()
  const repo = site.repository
    ? html`<a href="https://github.com/${site.repository.owner}/${site.repository.name}" rel="noopener">${i18n.t('footer.source')}</a>`
    : ''
  return html`<footer class="cp-foot">
    <div class="cp-foot__grille" aria-hidden="true"></div>
    <div class="cp-foot__plate">
      <div class="cp-foot__power">
        <span class="cp-foot__lamp" aria-hidden="true"></span>
        <span class="cp-engrave">POWER</span>
      </div>
      <p class="cp-foot__line">
        <span>© ${year} ${site.author.name}</span>
        <span>CODE ${site.license.code}</span>
        <span>TEXT ${site.license.content}</span>
        <span>${i18n.t('footer.built')}</span>
        ${repo}
      </p>
      <p class="cp-foot__model" aria-hidden="true">MODEL DX-${pad(year % 10000, 4)} <span>${i18n.lang.toUpperCase()}</span></p>
    </div>
  </footer>`
}

export function baseLayout(ctx: ThemeContext, options: BaseOptions): SafeHtml {
  const config = getCapstanConfig(ctx)
  const hasPanel = Boolean(options.panel)
  return html`<!doctype html>
<html lang="${ctx.i18n.lang}">
  <head>
    ${head(ctx)}
  </head>
  <body class="cp cp--${ctx.page.kind}${hasPanel ? ' cp--panel' : ''}${config.scanlines ? ' cp--scan' : ''}">
    <a class="cp-skip" href="#main">${ctx.i18n.t('a11y.skip')}</a>
    <div class="cp-shell">
      ${deck(ctx)}
      <div class="cp-scrim" data-deck-close aria-hidden="true"></div>
      <div class="cp-stage">
        ${topbar(ctx, options.crumb)}
        <div class="cp-grid">
          <main id="main" class="cp-transport" tabindex="-1">
            ${roller('top')}
            <div class="cp-strip">
              <div class="cp-strip__paper">${options.body}</div>
            </div>
            ${roller('bottom')}
          </main>
          ${hasPanel ? html`<aside class="cp-panel" aria-label="${ctx.i18n.t('panel.monitor')}">${options.panel}</aside>` : ''}
        </div>
        ${footer(ctx)}
      </div>
    </div>
    ${ctx.assets.themeJs ? html`<script type="module" src="${ctx.assets.themeJs}"></script>` : ''}
    ${ctx.page.kind === 'search' && ctx.assets.searchJs ? html`<script src="${ctx.assets.searchJs}" defer></script>` : ''}
  </body>
</html>`
}
