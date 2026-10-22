import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import rehypeShiki from '@shikijs/rehype'
import type { Element, Root as HastRoot } from 'hast'
import { toText } from 'hast-util-to-text'
import type { Root as MdastRoot } from 'mdast'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import type { Processor } from 'unified'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { readingMinutes } from '../shared/date.ts'
import { BuildError } from '../shared/errors.ts'
import { stripHtml } from '../shared/html.ts'
import type { SiteConfig } from './config.ts'
import type { TocEntry } from './types.ts'

const PIPELINE_VERSION = '3'

export interface MarkdownResult {
  html: string
  toc: TocEntry[]
  hasMath: boolean
  excerpt: string
  readingMinutes: number
}

export interface MarkdownRenderer {
  render(source: string, file: string): Promise<MarkdownResult>
}

interface CachedResult extends MarkdownResult {}

function collectToc() {
  return (tree: HastRoot, file: { data: Record<string, unknown> }) => {
    const toc: TocEntry[] = []
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'h2' && node.tagName !== 'h3') return
      const id = node.properties?.id
      if (typeof id !== 'string') return
      toc.push({
        depth: Number(node.tagName.slice(1)),
        id,
        text: toText(node).trim(),
      })
    })
    file.data.toc = toc
  }
}

type MarkdownProcessor = Processor<MdastRoot, MdastRoot, HastRoot, HastRoot, string>

function rehypeBaseLinks(options: { base: string }) {
  const prefix = options.base === '/' ? '' : options.base.replace(/\/$/, '')
  return (tree: HastRoot): void => {
    if (!prefix) return
    visit(tree, 'element', (node: Element) => {
      for (const property of ['href', 'src'] as const) {
        const value = node.properties?.[property]
        if (typeof value !== 'string') continue
        if (!value.startsWith('/') || value.startsWith('//')) continue
        if (value === prefix || value.startsWith(`${prefix}/`)) continue
        node.properties[property] = `${prefix}${value}`
      }
    })
  }
}

function buildProcessor(config: SiteConfig): MarkdownProcessor {
  const allowHtml = config.markdown.allowHtml
  const math = config.features.math

  let processor = unified().use(remarkParse).use(remarkGfm) as unknown as MarkdownProcessor
  if (math) processor = processor.use(remarkMath) as unknown as MarkdownProcessor

  processor = processor.use(remarkRehype, {
    allowDangerousHtml: allowHtml,
  }) as unknown as MarkdownProcessor
  if (allowHtml) {
    processor = processor.use(rehypeRaw).use(rehypeSanitize) as unknown as MarkdownProcessor
  }
  processor = processor.use(rehypeBaseLinks as never, {
    base: config.site.base,
  }) as unknown as MarkdownProcessor
  processor = processor.use(rehypeSlug).use(rehypeAutolinkHeadings, {
    behavior: 'wrap',
    properties: { className: ['heading-anchor'] },
  }) as unknown as MarkdownProcessor

  if (math) {
    processor = processor.use(rehypeKatex, {
      strict: 'warn',
      output: 'htmlAndMathml',
    }) as unknown as MarkdownProcessor
  }

  return processor
    .use(rehypeShiki, {
      themes: {
        light: config.markdown.shiki.light,
        dark: config.markdown.shiki.dark,
      },
      defaultColor: false,
    })
    .use(collectToc)
    .use(rehypeStringify) as unknown as MarkdownProcessor
}

function excerptFromHtml(html: string): string {
  const paragraph = html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)
  const text = stripHtml(paragraph?.[1] ?? html)
  if (text.length <= 160) return text
  return `${text.slice(0, 157).trimEnd()}...`
}

function cacheKey(config: SiteConfig, source: string): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        version: PIPELINE_VERSION,
        source,
        base: config.site.base,
        math: config.features.math,
        allowHtml: config.markdown.allowHtml,
        shiki: config.markdown.shiki,
      }),
    )
    .digest('hex')
}

export function createMarkdownRenderer(config: SiteConfig, root: string): MarkdownRenderer {
  const processor = buildProcessor(config)
  const cacheDir = path.join(root, '.cache', 'markdown')

  return {
    async render(source: string, file: string): Promise<MarkdownResult> {
      const key = cacheKey(config, source)
      const cacheFile = path.join(cacheDir, `${key}.json`)

      try {
        const cached = JSON.parse(await readFile(cacheFile, 'utf8')) as CachedResult
        if (
          typeof cached.html === 'string' &&
          Array.isArray(cached.toc) &&
          typeof cached.hasMath === 'boolean' &&
          typeof cached.excerpt === 'string' &&
          typeof cached.readingMinutes === 'number'
        ) {
          return cached
        }
      } catch {
        // Cache miss or unreadable cache is not an error.
      }

      let html: string
      let toc: TocEntry[] = []
      try {
        const result = await processor.process(source)
        html = String(result)
        toc = (result.data.toc as TocEntry[] | undefined) ?? []
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new BuildError(`Failed to render Markdown: ${message}`, {
          code: 'MARKDOWN',
          file,
          hint: 'check the formula or Markdown syntax near the reported content',
          cause: error,
        })
      }

      const result: MarkdownResult = {
        html,
        toc,
        hasMath: /class="[^"]*\bkatex\b/.test(html),
        excerpt: excerptFromHtml(html),
        readingMinutes: readingMinutes(stripHtml(html)),
      }

      try {
        await mkdir(cacheDir, { recursive: true })
        await writeFile(cacheFile, JSON.stringify(result), 'utf8')
      } catch {
        // A read-only cache directory must not fail the build.
      }

      return result
    },
  }
}
