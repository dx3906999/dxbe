import { html, type LayoutFn, type Publication } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'

function authors(list: string[], self: string): unknown[] {
  return list.map(
    (name, n) => html`${n > 0 ? ', ' : ''}${name === self ? html`<strong>${name}</strong>` : name}`,
  )
}

function entry(publication: Publication, self: string) {
  const meta = [publication.venue, publication.year].filter(Boolean).join(', ')
  return html`<li class="pub">
    ${publication.type ? html`<p class="pub-type">${publication.type}</p>` : ''}
    <h2 class="pub-title">${publication.title}</h2>
    ${publication.authors.length > 0 ? html`<p class="pub-authors">${authors(publication.authors, self)}</p>` : ''}
    ${meta ? html`<p class="pub-venue">${meta}</p>` : ''}
    ${publication.note ? html`<p class="pub-note">${publication.note}</p>` : ''}
    ${
      publication.links.length > 0
        ? html`<p class="pub-links">${publication.links.map(
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
      class="post page publications"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${page.title}">
      <header class="post-header">
        <h1>${page.title}</h1>
      </header>
      ${page.html.value ? html`<div class="post-body">${page.html}</div>` : ''}
      <ol class="pub-list">${list.map((publication) => entry(publication, ctx.site.author.name))}</ol>
    </article>`,
  )
}
