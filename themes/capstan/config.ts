import type { ThemeContext } from '../../src/theme/api.ts'

export interface CapstanConfig {
  showToc: boolean
  showReadingTime: boolean
  scanlines: boolean
}

export function getCapstanConfig(ctx: ThemeContext): CapstanConfig {
  return ctx.theme as CapstanConfig
}
