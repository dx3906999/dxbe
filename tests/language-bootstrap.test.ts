import { describe, expect, it } from 'vitest'
import { unwrap } from '../src/shared/html.ts'
import { languageBootstrap, type ThemeContext } from '../src/theme/api.ts'

function context(
  options: {
    autoLanguage?: boolean
    lang?: string
    defaultLang?: string
    base?: string
    languages?: Array<{ code: string; label: string; url: string }>
  } = {},
): ThemeContext {
  const lang = options.lang ?? 'zh'
  const defaultLang = options.defaultLang ?? 'zh'
  const base = options.base ?? '/blog/'
  const languages = options.languages ?? [
    { code: defaultLang, label: 'Default', url: base },
    { code: 'en', label: 'English', url: `${base}en/` },
  ]
  return {
    site: {
      autoLanguage: options.autoLanguage ?? true,
      base,
      defaultLang,
      languages,
    },
    i18n: {
      lang,
      alternates: [],
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
    expect(script).toContain('"zh":"/blog/"')
    expect(script).toContain('"en":"/blog/en/"')
    expect(script).toContain('location.replace')
    expect(script).toContain('dxbe.lang.redirected:/blog/')
    expect(script).toContain('sessionStorage')
    expect(script).toContain('if (!true) return;')
  })

  it('still records an explicit language choice on non-default pages', () => {
    const script = unwrap(languageBootstrap(context({ lang: 'en' })))

    expect(script).toContain('data-language')
    expect(script).toContain('if (!false) return;')
  })

  it('returns nothing when autoLanguage is off or there is only one language', () => {
    expect(unwrap(languageBootstrap(context({ autoLanguage: false })))).toBe('')
    expect(
      unwrap(
        languageBootstrap(context({ languages: [{ code: 'zh', label: '中文', url: '/blog/' }] })),
      ),
    ).toBe('')
  })
})
