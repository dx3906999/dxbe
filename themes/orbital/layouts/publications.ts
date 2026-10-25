import { html, type LayoutFn, type Publication } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'

function authors(list: string[], self: string): unknown[] {
  return list.map(
    (name, n) => html`${n > 0 ? ', ' : ''}${name === self ? html`<strong>${name}</strong>` : name}`,
  )
}

function entry(publication: Publication, n: number, self: string) {
  return html`<li class="orbital-pub">
    <p class="orbital-pub-index">
      <span>${String(n + 1).padStart(2, '0')}</span>
      ${publication.year ? html`<span>${publication.year}</span>` : ''}
      ${publication.type ? html`<span>${publication.type}</span>` : ''}
    </p>
    <h2 class="orbital-pub-title">${publication.title}</h2>
    ${publication.authors.length > 0 ? html`<p class="orbital-pub-authors">${authors(publication.authors, self)}</p>` : ''}
    ${publication.venue ? html`<p class="orbital-pub-venue">${publication.venue}</p>` : ''}
    ${publication.note ? html`<p class="orbital-pub-note">${publication.note}</p>` : ''}
    ${
      publication.links.length > 0
        ? html`<p class="orbital-pub-links">${publication.links.map(
            (link) => html`<a href="${link.url}">${link.label}</a>`,
          )}</p>`
        : ''
    }
  </li>`
}

export const publications: LayoutFn = (ctx) => {
  const page = ctx.pageItem
  if (!page) return baseLayout(ctx, html`<p>${ctx.seo.description}</p>`)
  const list = page.publications ?? []
  return baseLayout(
    ctx,
    html`<article
      class="orbital-post orbital-page"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${page.title}">
      <header class="orbital-post-header">
        <p class="kicker">${ctx.i18n.t('page.publications')} · ${String(list.length).padStart(3, '0')}</p>
        <h1>${page.title}</h1>
      </header>
      ${page.html.value ? html`<div class="orbital-body">${page.html}</div>` : ''}
      <ol class="orbital-pubs">${list.map((publication, n) => entry(publication, n, ctx.site.author.name))}</ol>
    </article>`,
  )
}
