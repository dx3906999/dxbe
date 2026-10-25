import { html, type LayoutFn, type Publication } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'

function authors(list: string[], self: string): unknown[] {
  return list.map(
    (name, n) => html`${n > 0 ? ', ' : ''}${name === self ? html`<strong>${name}</strong>` : name}`,
  )
}

/** A reference-list entry: authors, title, venue, year, then the links. */
function entry(publication: Publication, self: string) {
  return html`<li class="scholar-pub">
    ${publication.authors.length > 0 ? html`<span class="scholar-pub-authors">${authors(publication.authors, self)}.</span>` : ''}
    <span class="scholar-pub-title">${publication.title}.</span>
    ${publication.venue ? html`<em class="scholar-pub-venue">${publication.venue}</em>${publication.year ? ', ' : '.'}` : ''}
    ${publication.year ? html`<span class="scholar-pub-year">${publication.year}.</span>` : ''}
    ${publication.type ? html`<span class="scholar-pub-type">${publication.type}</span>` : ''}
    ${publication.note ? html`<span class="scholar-pub-note">${publication.note}</span>` : ''}
    ${
      publication.links.length > 0
        ? html`<span class="scholar-pub-links">${publication.links.map(
            (link) => html`<a href="${link.url}">${link.label}</a>`,
          )}</span>`
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
      class="scholar-post scholar-page"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${page.title}">
      <header class="scholar-title">
        <p class="scholar-kicker">${ctx.i18n.t('page.publications')}</p>
        <h1>${page.title}</h1>
      </header>
      ${page.summary ? html`<p class="scholar-lead">${page.summary}</p>` : ''}
      <div class="scholar-layout no-toc">
        <div class="scholar-body">
          ${page.html.value ? page.html : ''}
          <ol class="scholar-pubs">${list.map((publication) => entry(publication, ctx.site.author.name))}</ol>
        </div>
      </div>
    </article>`,
  )
}
