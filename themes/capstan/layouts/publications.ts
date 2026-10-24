import { html, type LayoutFn, type Publication } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { pad, printHead } from './components.ts'

function authors(list: string[], self: string): unknown[] {
  return list.map(
    (name, n) => html`${n > 0 ? ', ' : ''}${name === self ? html`<strong>${name}</strong>` : name}`,
  )
}

/** One printed bibliography record: index and year in the margin, keys for the links. */
function record(publication: Publication, n: number, self: string) {
  return html`<li class="cp-pub">
    <div class="cp-pub__margin">
      <span class="cp-pub__no">[${pad(n + 1, 2)}]</span>
      ${publication.year ? html`<span class="cp-pub__year">${publication.year}</span>` : ''}
    </div>
    <div class="cp-pub__body">
      <h2 class="cp-pub__title">${publication.title}</h2>
      ${publication.authors.length > 0 ? html`<p class="cp-pub__authors">${authors(publication.authors, self)}</p>` : ''}
      <p class="cp-pub__meta">
        ${publication.type ? html`<span class="cp-pub__type">${publication.type}</span>` : ''}
        ${publication.venue ? html`<span>${publication.venue}</span>` : ''}
      </p>
      ${publication.note ? html`<p class="cp-pub__note">${publication.note}</p>` : ''}
      ${
        publication.links.length > 0
          ? html`<p class="cp-pub__links">${publication.links.map(
              (link) =>
                html`<a class="cp-tag cp-pub__key" href="${link.url}" rel="noopener">${link.label}</a>`,
            )}</p>`
          : ''
      }
    </div>
  </li>`
}

export const publications: LayoutFn = (ctx) => {
  const item = ctx.pageItem
  const list = item?.publications ?? []
  const body = html`<article class="cp-article"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${item?.title ?? ctx.page.title}">
    ${printHead({
      program: 'BIBLIO',
      title: item?.title ?? ctx.page.title,
      lede: item?.summary,
      count: pad(list.length, 3),
    })}
    ${item?.html.value ? html`<div class="cp-prose cp-pubs__intro">${item.html}</div>` : ''}
    <ol class="cp-pubs">${list.map((publication, n) => record(publication, n, ctx.site.author.name))}</ol>
  </article>`
  return baseLayout(ctx, { body, crumb: { current: 'BIBLIO' } })
}
