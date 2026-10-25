import {
  html,
  languageBootstrap,
  raw,
  type SafeHtml,
  type ThemeContext,
} from '../../../src/theme/api.ts'

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
    const stored = localStorage.getItem('scholar-theme');
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = stored || (dark ? 'dark' : 'light');
  } catch {}
})();
</script>`)
}

export interface BaseOptions {
  /** Right-hand column: contents, recent articles, index terms. */
  panel?: SafeHtml
  /** Breadcrumb after the home link; defaults to the page title. */
  crumb?: SafeHtml
}

function rail(ctx: ThemeContext): SafeHtml {
  const t = ctx.i18n.t
  const languageLinks = ctx.i18n.alternates.filter((alternate) => alternate.lang !== ctx.i18n.lang)
  return html`<aside class="scholar-rail" id="scholar-rail" aria-label="${t('nav.label')}">
    <div class="scholar-rail-inner">
      <div class="masthead">
        ${ctx.site.tagline ? html`<p class="masthead-label">${ctx.site.tagline}</p>` : ''}
        <a class="masthead-title" href="${homeUrl(ctx)}">${ctx.site.title}</a>
        <p class="masthead-description">${ctx.site.description}</p>
      </div>
      <div class="masthead-rule" aria-hidden="true"></div>
      <nav class="scholar-nav" aria-label="${t('nav.label')}">
        ${ctx.nav.map(
          (item) =>
            html`<a href="${item.url}" aria-current="${item.current ? 'page' : 'false'}">${item.label}</a>`,
        )}
      </nav>
      <div class="scholar-rail-foot">
        <div class="scholar-tools">
          ${
            languageLinks.length > 0
              ? html`<nav class="scholar-language" aria-label="${t('language.switch')}">
                ${languageLinks.map(
                  (alternate) =>
                    html`<a href="${ctx.helpers.url(alternate.url)}" data-language="${alternate.lang}" lang="${alternate.lang}" hreflang="${alternate.lang}">${alternate.label}</a>`,
                )}
              </nav>`
              : ''
          }
          <button class="scholar-toggle" type="button" data-theme-toggle aria-label="${t('theme.toggle')}">
            ${t('theme.toggle')}
          </button>
        </div>
        <p class="scholar-rail-links">
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
  return html`<header class="scholar-top">
    <button class="scholar-menu" type="button" data-rail-toggle aria-controls="scholar-rail" aria-expanded="false" aria-label="${t('a11y.menu')}">
      <span></span><span></span><span></span>
    </button>
    <nav class="scholar-crumb" aria-label="${t('a11y.breadcrumb')}">
      <a href="${homeUrl(ctx)}">${t('nav.home')}</a>
      ${
        crumb
          ? html`<span class="scholar-crumb-sep" aria-hidden="true">/</span>${crumb}`
          : current
            ? html`<span class="scholar-crumb-sep" aria-hidden="true">/</span><span aria-current="page">${current}</span>`
            : ''
      }
    </nav>
    ${
      ctx.assets.searchJs && ctx.page.kind !== 'search'
        ? html`<form class="scholar-query" action="${searchUrl(ctx)}" method="get" role="search">
          <label class="visually-hidden" for="scholar-q">${t('nav.search')}</label>
          <input id="scholar-q" name="q" type="search" placeholder="${t('search.placeholder')}" autocomplete="off">
        </form>`
        : ''
    }
    <div class="scholar-progress" aria-hidden="true"><span data-progress></span></div>
  </header>`
}

function footer(ctx: ThemeContext): SafeHtml {
  const t = ctx.i18n.t
  const repositoryUrl = ctx.site.repository
    ? `https://github.com/${ctx.site.repository.owner}/${ctx.site.repository.name}`
    : undefined
  return html`<footer class="scholar-footer">
    <p>${
      ctx.site.author.url
        ? html`<a href="${ctx.site.author.url}" rel="noopener">${ctx.site.author.name}</a>`
        : ctx.site.author.name
    }</p>
    <p>
      ${t('footer.license')}: ${ctx.site.license.code} / ${ctx.site.license.content}
      ${repositoryUrl ? html`<a href="${repositoryUrl}" rel="noopener">${t('footer.source')}</a>` : ''}
    </p>
  </footer>`
}

export function baseLayout(
  ctx: ThemeContext,
  content: SafeHtml,
  options: BaseOptions = {},
): SafeHtml {
  const t = ctx.i18n.t
  const hasPanel = Boolean(options.panel?.value)

  return html`<!doctype html>
<html lang="${ctx.i18n.lang}" data-theme="auto">
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
  <body class="page-${ctx.page.kind}${hasPanel ? ' has-panel' : ''}">
    <a class="skip-link" href="#main">${t('a11y.skip')}</a>
    <div class="scholar-shell">
      ${rail(ctx)}
      <div class="scholar-scrim" data-rail-close aria-hidden="true"></div>
      <div class="scholar-stage">
        ${topbar(ctx, options.crumb)}
        <div class="scholar-grid">
          <main id="main" class="scholar-main" tabindex="-1">
            ${content}
          </main>
          ${hasPanel ? html`<aside class="scholar-panel" aria-label="${t('a11y.panel')}">${options.panel}</aside>` : ''}
        </div>
        ${footer(ctx)}
      </div>
    </div>
    ${ctx.assets.themeJs ? html`<script type="module" src="${ctx.assets.themeJs}"></script>` : ''}
  </body>
</html>`
}
