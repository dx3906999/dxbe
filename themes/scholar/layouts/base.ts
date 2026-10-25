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

export function baseLayout(ctx: ThemeContext, content: SafeHtml): SafeHtml {
  const t = ctx.i18n.t
  const home = homeUrl(ctx)
  const languageLinks = ctx.i18n.alternates.filter((alternate) => alternate.lang !== ctx.i18n.lang)
  const hasSearch = Boolean(ctx.assets.searchJs)
  const repositoryUrl = ctx.site.repository
    ? `https://github.com/${ctx.site.repository.owner}/${ctx.site.repository.name}`
    : undefined

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
  <body class="page-${ctx.page.kind}">
    <a class="skip-link" href="#main">${t('a11y.skip')}</a>
    <header class="scholar-header">
      <div class="wrap">
        <div class="masthead">
          ${ctx.site.tagline ? html`<p class="masthead-label">${ctx.site.tagline}</p>` : ''}
          <a class="masthead-title" href="${home}">${ctx.site.title}</a>
          <p class="masthead-description">${ctx.site.description}</p>
        </div>
        <div class="masthead-rule" aria-hidden="true"></div>
        <div class="scholar-bar">
          <nav class="scholar-nav" aria-label="${t('nav.label')}">
            ${ctx.nav.map(
              (item) =>
                html`<a href="${item.url}" aria-current="${item.current ? 'page' : 'false'}">${item.label}</a>`,
            )}
            ${
              hasSearch && !ctx.nav.some((item) => item.key === 'search')
                ? html`<a href="${searchUrl(ctx)}" aria-current="${ctx.page.kind === 'search' ? 'page' : 'false'}">${t('nav.search')}</a>`
                : ''
            }
          </nav>
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
        </div>
      </div>
    </header>
    <main id="main" class="scholar-main">
      <div class="wrap">
        ${content}
      </div>
    </main>
    <footer class="scholar-footer">
      <div class="wrap">
        <p>${
          ctx.site.author.url
            ? html`<a href="${ctx.site.author.url}" rel="noopener">${ctx.site.author.name}</a>`
            : ctx.site.author.name
        }</p>
        <p>
          ${t('footer.license')}: ${ctx.site.license.code} / ${ctx.site.license.content}
          ${ctx.site.social.map(
            (social) =>
              html`<a href="${social.url.startsWith('/') ? ctx.helpers.url(social.url) : social.url}" rel="noopener">${social.label}</a>`,
          )}
          ${
            repositoryUrl
              ? html`<a href="${repositoryUrl}" rel="noopener">${t('footer.source')}</a>`
              : ''
          }
          <a href="${atomUrl(ctx)}">${t('footer.rss')}</a>
        </p>
      </div>
    </footer>
    ${ctx.assets.themeJs ? html`<script type="module" src="${ctx.assets.themeJs}"></script>` : ''}
  </body>
</html>`
}
