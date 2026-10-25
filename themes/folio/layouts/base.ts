import {
  html,
  languageBootstrap,
  raw,
  type SafeHtml,
  type ThemeContext,
} from '../../../src/theme/api.ts'
import { getFolioConfig } from '../config.ts'

export interface BaseOptions {
  /** Right-hand column: table of contents, recent posts, tags. */
  panel?: SafeHtml
  /** Breadcrumb after the home link; defaults to the page title. */
  crumb?: SafeHtml
}

function homeUrl(ctx: ThemeContext): string {
  const lang = ctx.i18n.lang
  return ctx.helpers.url(lang === ctx.site.defaultLang ? '/' : `/${lang}/`)
}

function atomUrl(ctx: ThemeContext): string {
  const lang = ctx.i18n.lang
  return ctx.helpers.url(lang === ctx.site.defaultLang ? '/atom.xml' : `/${lang}/atom.xml`)
}

function searchUrl(ctx: ThemeContext): string {
  const lang = ctx.i18n.lang
  return ctx.helpers.url(lang === ctx.site.defaultLang ? '/search/' : `/${lang}/search/`)
}

function themeInitScript(): SafeHtml {
  return raw(`<script>
(() => {
  try {
    const stored = localStorage.getItem('folio-theme');
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = stored || (dark ? 'dark' : 'light');
  } catch {}
})();
</script>`)
}

function rail(ctx: ThemeContext): SafeHtml {
  const t = ctx.i18n.t
  const languageLinks = ctx.i18n.alternates.filter((alternate) => alternate.lang !== ctx.i18n.lang)
  return html`<aside class="rail" id="rail" aria-label="${t('nav.label')}">
    <div class="rail-inner">
      <div class="brand">
        <a class="site-title" href="${homeUrl(ctx)}">${ctx.site.title}</a>
        <p class="site-tagline">${ctx.site.tagline}</p>
      </div>
      <nav class="site-nav" aria-label="${t('nav.label')}">
        ${ctx.nav.map(
          (item) =>
            html`<a href="${item.url}"${item.external ? raw(' rel="noopener"') : ''} aria-current="${item.current ? 'page' : 'false'}">${item.label}</a>`,
        )}
      </nav>
      <div class="rail-foot">
        <div class="header-tools">
          ${
            languageLinks.length > 0
              ? html`<nav class="language-switch" aria-label="${t('language.switch')}">
                ${languageLinks.map(
                  (alternate) =>
                    html`<a href="${ctx.helpers.url(alternate.url)}" data-language="${alternate.lang}" lang="${alternate.lang}" hreflang="${alternate.lang}">${alternate.label}</a>`,
                )}
              </nav>`
              : ''
          }
          <button class="theme-toggle" type="button" data-theme-toggle aria-label="${t('theme.toggle')}">
            ${t('theme.toggle')}
          </button>
        </div>
        <p class="rail-links">
          ${ctx.site.social.map(
            (social) =>
              html`<a href="${social.url.startsWith('/') ? ctx.helpers.url(social.url) : social.url}" rel="noopener">${social.label}</a>`,
          )}
          <a href="${atomUrl(ctx)}">${t('footer.rss')}</a>
        </p>
      </div>
    </div>
  </aside>`
}

function topbar(ctx: ThemeContext, crumb: SafeHtml | undefined): SafeHtml {
  const t = ctx.i18n.t
  const atHome =
    ctx.page.kind === 'home' ||
    (ctx.page.kind === 'index' && ctx.routes.posts === ctx.routes.home && !ctx.pagination?.prevUrl)
  const current = atHome ? '' : ctx.page.title
  return html`<header class="topbar">
    <button class="menu-toggle" type="button" data-rail-toggle aria-controls="rail" aria-expanded="false" aria-label="${t('a11y.menu')}">
      <span></span><span></span><span></span>
    </button>
    <nav class="crumb" aria-label="${t('a11y.breadcrumb')}">
      <a href="${homeUrl(ctx)}">${t('nav.home')}</a>
      ${
        crumb
          ? html`<span class="crumb-sep" aria-hidden="true">/</span>${crumb}`
          : current
            ? html`<span class="crumb-sep" aria-hidden="true">/</span><span aria-current="page">${current}</span>`
            : ''
      }
    </nav>
    ${
      ctx.assets.searchJs && ctx.page.kind !== 'search'
        ? html`<form class="topbar-search" action="${searchUrl(ctx)}" method="get" role="search">
          <label class="visually-hidden" for="topbar-q">${t('nav.search')}</label>
          <input id="topbar-q" name="q" type="search" placeholder="${t('search.placeholder')}" autocomplete="off">
        </form>`
        : ''
    }
    <div class="progress" aria-hidden="true"><span data-progress></span></div>
  </header>`
}

function footer(ctx: ThemeContext): SafeHtml {
  const t = ctx.i18n.t
  const repository = ctx.site.repository
  const repositoryUrl = repository
    ? `https://github.com/${repository.owner}/${repository.name}`
    : undefined
  return html`<footer class="site-footer">
    <div class="footer-inner">
      <p>${
        ctx.site.author.url
          ? html`<a href="${ctx.site.author.url}" rel="noopener">${ctx.site.author.name}</a>`
          : ctx.site.author.name
      }</p>
      <p>
        <span>${t('footer.license')}: ${ctx.site.license.code} / ${ctx.site.license.content}</span>
        ${
          repositoryUrl
            ? html`<a href="${repositoryUrl}" rel="noopener">${t('footer.source')}</a>`
            : ''
        }
      </p>
    </div>
  </footer>`
}

export function baseLayout(
  ctx: ThemeContext,
  content: SafeHtml,
  options: BaseOptions = {},
): SafeHtml {
  const config = getFolioConfig(ctx)
  const t = ctx.i18n.t
  const hasPanel = Boolean(options.panel?.value)

  return html`<!doctype html>
<html lang="${ctx.i18n.lang}" data-theme="auto" style="--accent: ${config.accent}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <link rel="icon" href="${ctx.helpers.url('/favicon.svg')}" type="image/svg+xml">
    <title>${ctx.seo.title}</title>
    <meta name="description" content="${ctx.seo.description}">
    <meta name="author" content="${ctx.site.author.name}">
    ${ctx.seo.robots ? html`<meta name="robots" content="${ctx.seo.robots}">` : ''}
    <link rel="canonical" href="${ctx.seo.canonical}">
    ${ctx.seo.alternates.map(
      (alternate) =>
        html`<link rel="alternate" hreflang="${alternate.lang}" href="${ctx.helpers.absoluteUrl(alternate.url)}">`,
    )}
    ${
      ctx.seo.alternates.length > 0
        ? html`<link rel="alternate" hreflang="x-default" href="${ctx.seo.xDefault}">`
        : ''
    }
    <link rel="alternate" type="application/atom+xml" title="${ctx.site.title}" href="${atomUrl(ctx)}">
    <meta property="og:type" content="${ctx.seo.ogType}">
    <meta property="og:title" content="${ctx.seo.title}">
    <meta property="og:description" content="${ctx.seo.description}">
    <meta property="og:url" content="${ctx.seo.canonical}">
    <meta property="og:site_name" content="${ctx.site.title}">
    <meta property="og:locale" content="${ctx.i18n.lang}">
    <meta name="twitter:card" content="${ctx.seo.image ? 'summary_large_image' : 'summary'}">
    <meta name="twitter:title" content="${ctx.seo.title}">
    <meta name="twitter:description" content="${ctx.seo.description}">
    ${ctx.seo.image ? html`<meta property="og:image" content="${ctx.seo.image}">` : ''}
    ${
      ctx.seo.publishedTime
        ? html`<meta property="article:published_time" content="${ctx.seo.publishedTime}">`
        : ''
    }
    ${
      ctx.seo.modifiedTime
        ? html`<meta property="article:modified_time" content="${ctx.seo.modifiedTime}">`
        : ''
    }
    ${(ctx.seo.tags ?? []).map((tag) => html`<meta property="article:tag" content="${tag}">`)}
    ${ctx.assets.themeCss ? html`<link rel="stylesheet" href="${ctx.assets.themeCss}">` : ''}
    ${ctx.assets.katexCss ? html`<link rel="stylesheet" href="${ctx.assets.katexCss}">` : ''}
    <script type="application/ld+json">${raw(ctx.seo.jsonLd)}</script>
    ${themeInitScript()}
    ${languageBootstrap(ctx)}
  </head>
  <body class="page-${ctx.page.kind} width-${config.width}${hasPanel ? ' has-panel' : ''}">
    <a class="skip-link" href="#main">${t('a11y.skip')}</a>
    <div class="shell">
      ${rail(ctx)}
      <div class="scrim" data-rail-close aria-hidden="true"></div>
      <div class="stage">
        ${topbar(ctx, options.crumb)}
        <div class="stage-grid">
          <main id="main" class="site-main" tabindex="-1">
            ${content}
          </main>
          ${hasPanel ? html`<aside class="panel" aria-label="${t('a11y.panel')}">${options.panel}</aside>` : ''}
        </div>
        ${footer(ctx)}
      </div>
    </div>
    ${ctx.assets.themeJs ? html`<script type="module" src="${ctx.assets.themeJs}"></script>` : ''}
  </body>
</html>`
}
