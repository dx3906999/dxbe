import { html, type LayoutFn, type Publication } from '../../../src/theme/api.ts'
import { baseLayout } from './base.ts'
import { pad, placard } from './components.ts'

function authors(list: string[], self: string): unknown[] {
  return list.map(
    (name, n) => html`${n > 0 ? ', ' : ''}${name === self ? html`<strong>${name}</strong>` : name}`,
  )
}

function entry(publication: Publication, n: number, self: string) {
  return html`<li class="ap-pub" data-reveal style="--i:${n}">
    <div class="ap-pub__rail">
      <span class="ap-pub__no"><span class="ap-label__key">P</span>-${pad(n + 1, 2)}</span>
      ${publication.year ? html`<span class="ap-pub__year">${publication.year}</span>` : ''}
    </div>
    <div class="ap-pub__body">
      ${publication.type ? html`<span class="ap-pub__type">${publication.type}</span>` : ''}
      <h2 class="ap-pub__title">${publication.title}</h2>
      ${publication.authors.length > 0 ? html`<p class="ap-pub__authors">${authors(publication.authors, self)}</p>` : ''}
      ${publication.venue ? html`<p class="ap-pub__venue">${publication.venue}</p>` : ''}
      ${publication.note ? html`<p class="ap-pub__note">${publication.note}</p>` : ''}
      ${
        publication.links.length > 0
          ? html`<p class="ap-pub__links">${publication.links.map(
              (link) =>
                html`<a class="ap-chip" href="${link.url}" rel="noopener">${link.label}</a>`,
            )}</p>`
          : ''
      }
    </div>
  </li>`
}

export const publications: LayoutFn = (ctx) => {
  const item = ctx.pageItem
  const list = item?.publications ?? []
  const body = html`<article class="ap-article"
      data-pagefind-body
      data-pagefind-filter="lang:${ctx.i18n.lang}"
      data-pagefind-meta="title:${item?.title ?? ctx.page.title}">
    ${placard({
      label: 'SECTION 04 · BIBLIOGRAPHY',
      title: item?.title ?? ctx.page.title,
      lede: item?.summary,
      count: pad(list.length, 3),
    })}
    ${item?.html.value ? html`<div class="ap-prose ap-pubs__intro">${item.html}</div>` : ''}
    <ol class="ap-pubs">${list.map((publication, n) => entry(publication, n, ctx.site.author.name))}</ol>
  </article>`
  return baseLayout(ctx, { body })
}
