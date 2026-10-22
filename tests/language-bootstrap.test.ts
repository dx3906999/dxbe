import { describe, expect, it } from 'vitest'
import { unwrap } from '../src/shared/html.ts'
import { languageBootstrap, type ThemeContext } from '../src/theme/api.ts'

function context(
  options: {
    autoLanguage?: boolean
    lang?: string
    defaultLang?: string
    base?: string
    alternates?: Array<{ lang: string; label: string; url: string }>
  } = {},
): ThemeContext {
  const lang = options.lang ?? 'zh'
  const defaultLang = options.defaultLang ?? 'zh'
  const base = options.base ?? '/blog/'
  return {
    site: {
      autoLanguage: options.autoLanguage ?? true,
      base,
      defaultLang,
    },
    i18n: {
      lang,
      alternates: options.alternates ?? [{ lang: 'en', label: 'English', url: '/en/' }],
    },
    helpers: {
      url: (pathname: string) => `${base}${pathname.replace(/^\//, '')}`,
    },
  } as unknown as ThemeContext
}

describe('language bootstrap', () => {
  it('emits a browser-language redirect for the default home page', () => {
    const script = unwrap(languageBootstrap(context()))

    expect(script).toContain('navigator.languages')
    expect(script).toContain('dxbe.lang:/blog/')
    expect(script).toContain('"en":"/blog/en/"')
    expect(script).toContain('location.replace')
    expect(script).toContain('if (!true) return;')
  })

  it('still records an explicit language choice on non-default pages', () => {
    const script = unwrap(
      languageBootstrap(
        context({
          lang: 'en',
          alternates: [{ lang: 'zh', label: '中文', url: '/' }],
        }),
      ),
    )

    expect(script).toContain('data-language')
    expect(script).toContain('if (!false) return;')
  })

  it('returns nothing when autoLanguage is off or there is no alternate', () => {
    expect(unwrap(languageBootstrap(context({ autoLanguage: false })))).toBe('')
    expect(unwrap(languageBootstrap(context({ alternates: [] })))).toBe('')
  })
})
