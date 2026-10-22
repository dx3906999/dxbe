const SAFE_HTML = Symbol.for('dxbe.safe-html')

export interface SafeHtml {
  readonly [SAFE_HTML]: true
  readonly value: string
}

export function raw(value: string): SafeHtml {
  return { [SAFE_HTML]: true, value }
}

export function isSafeHtml(value: unknown): value is SafeHtml {
  return typeof value === 'object' && value !== null && SAFE_HTML in value
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined || value === false) return ''
  if (isSafeHtml(value)) return value.value
  if (Array.isArray(value)) return value.map(renderValue).join('')
  if (typeof value === 'string') return escapeHtml(value)
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : ''
  throw new TypeError(`Cannot interpolate ${typeof value} into html`)
}

/**
 * Tagged template that escapes every interpolation unless it is explicitly
 * produced by raw(). Core-rendered content is always wrapped before it reaches
 * a theme.
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = strings[0] ?? ''
  for (let i = 0; i < values.length; i += 1) {
    out += renderValue(values[i])
    out += strings[i + 1] ?? ''
  }
  return raw(out)
}

export function unwrap(value: SafeHtml | string): string {
  return isSafeHtml(value) ? value.value : value
}

export function stripHtml(value: string): string {
  return decodeEntities(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

function decodeEntities(value: string): string {
  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
}

export function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}
