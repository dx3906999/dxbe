import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    cli: 'src/cli/index.ts',
    theme: 'src/theme/api.ts',
    config: 'src/core/config.ts',
    'themes/folio/theme': 'themes/folio/theme.ts',
    'themes/orbital/theme': 'themes/orbital/theme.ts',
    'themes/scholar/theme': 'themes/scholar/theme.ts',
    'themes/apogee/theme': 'themes/apogee/theme.ts',
    'themes/capstan/theme': 'themes/capstan/theme.ts',
  },
  format: ['esm'],
  target: 'node24',
  platform: 'node',
  dts: false,
  clean: true,
  splitting: false,
  sourcemap: false,
  treeshake: true,
  external: [/^[^./]/],
  banner: { js: '#!/usr/bin/env node' },
})
