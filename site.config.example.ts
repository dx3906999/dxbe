import { defineConfig } from 'dxbe/config'

/**
 * Copy this file to site.config.ts, or run `npm run setup`.
 *
 * Everything site-specific lives here. The engine, themes, and CI do not
 * contain an author name, GitHub username, repository name, or domain.
 */
export default defineConfig({
  identity: {
    author: {
      name: 'Your Name',
      email: 'you@example.com',
      url: 'https://example.com',
      avatar: '',
    },
    social: [
      { label: 'GitHub', url: 'https://github.com/your-name' },
      { label: 'RSS', url: '/atom.xml' },
    ],
    // Optional. Used for the footer source link and local base inference.
    // deployment still relies on actions/configure-pages.
    repository: { owner: 'your-name', name: 'your-blog' },
  },
  locales: {
    default: 'zh',
    entries: {
      zh: {
        label: '中文',
        title: '你的博客',
        description: '一句话说明这个博客写什么。',
        tagline: '一句更短的副标题。',
      },
      en: {
        label: 'English',
        title: 'Your Blog',
        description: 'One sentence about what this blog covers.',
        tagline: 'A shorter subtitle.',
      },
    },
  },
  site: {
    // Use an origin only. For project pages, put /repo/ in base.
    url: 'https://example.com',
    base: '/',
    // customDomain: 'blog.example.com',
    timezone: 'Asia/Shanghai',
    license: {
      code: 'MIT',
      content: 'CC BY-NC-SA 4.0',
    },
  },
  theme: {
    name: 'folio',
    // Theme options are validated by each theme's own schema.
    config: {},
  },
  nav: [
    { key: 'home', path: '/' },
    { key: 'archives', path: '/archives/' },
    { key: 'tags', path: '/tags/' },
    { key: 'about', path: '/about/' },
  ],
  pagination: {
    perPage: 10,
  },
  features: {
    search: true,
    math: true,
  },
})
