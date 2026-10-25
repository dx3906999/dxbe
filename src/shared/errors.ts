export type ErrorCode = 'CONFIG' | 'CONTENT' | 'MARKDOWN' | 'THEME' | 'OUTPUT' | 'USAGE' | 'DEPLOY'

export interface BuildErrorOptions {
  code: ErrorCode
  file?: string
  line?: number
  hint?: string
  cause?: unknown
}

export class BuildError extends Error {
  readonly code: ErrorCode
  readonly file?: string
  readonly line?: number
  readonly hint?: string

  constructor(message: string, options: BuildErrorOptions) {
    super(message, { cause: options.cause })
    this.name = 'BuildError'
    this.code = options.code
    this.file = options.file
    this.line = options.line
    this.hint = options.hint
  }
}

export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}

export function formatError(error: unknown): string {
  if (error instanceof BuildError) {
    const location = error.file ? `${error.file}${error.line ? `:${error.line}` : ''}` : ''
    const lines = [`[${error.code}] ${error.message}`]
    if (location) lines.push(`  at ${location}`)
    if (error.hint) lines.push(`  hint: ${error.hint}`)
    return lines.join('\n')
  }
  if (error instanceof Error) {
    return error.stack ?? error.message
  }
  return String(error)
}
