import type { ThemeContext } from '../../src/theme/api.ts'

export interface ApogeeConfig {
  showToc: boolean
  showReadingTime: boolean
  missionClock: boolean
}

export function getApogeeConfig(ctx: ThemeContext): ApogeeConfig {
  return ctx.theme as ApogeeConfig
}
