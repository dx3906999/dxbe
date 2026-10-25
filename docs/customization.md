# 配置与复用

这个项目按“引擎包 + 博客实例”组织。`dxbe` 是 npm 包，博客仓库只放内容、配置和 `public/`；作者名、域名、仓库名都在博客仓库的 `site.config.ts`。

## 创建博客仓库

```bash
mkdir my-blog
cd my-blog
npm init -y
npm install https://github.com/dx3906999/dxbe/releases/download/v0.8.1/dxbe-0.8.1.tgz
npx dxbe setup
npx dxbe dev
```

博客仓库需要的文件：

```
content/
public/          # 可选；没有 favicon.svg 时用 dxbe 自带的
site.config.ts
package.json
.nvmrc
.gitignore
.github/workflows/deploy.yml
```

`dxbe setup` 会生成 `site.config.ts`，并在覆盖前生成 `site.config.ts.bak`。它还会把 `package.json` 设为 `"type": "module"`、补上缺少的 dxbe 脚本，并在缺失时生成 `.nvmrc` 和 `.gitignore`（已有的 `.gitignore` 只追加缺少的条目）。把引擎仓库的 `templates/deploy.yml` 复制到博客仓库的 `.github/workflows/deploy.yml`，然后在 Pages 里选择 **GitHub Actions**。

`dxbe setup` 会在博客仓库的 `package.json` 里补上这些脚本（已有的同名脚本保持不变）：

```json
{
  "scripts": {
    "dev": "dxbe dev",
    "build": "dxbe build",
    "check": "dxbe check",
    "preview": "dxbe preview",
    "new": "dxbe new",
    "index": "dxbe index",
    "clean": "dxbe clean"
  }
}
```

## 非交互配置

```bash
npx dxbe setup --yes --force \
  --name "Your Name" \
  --email "you@example.com" \
  --github "https://github.com/you" \
  --title-zh "你的博客" \
  --description-zh "一句话说明" \
  --tagline-zh "更短的副标题" \
  --title-en "Your Blog" \
  --description-en "One sentence" \
  --tagline-en "A shorter subtitle" \
  --url "https://example.com" \
  --theme folio \
  --repo-owner you \
  --repo-name your-blog
```

可选 `--domain blog.example.com`。不传 `--force` 时不会覆盖已有 `site.config.ts`。

## 配置字段

| 字段 | 说明 |
| --- | --- |
| `identity.author` | 作者姓名、邮箱、主页、头像 |
| `identity.social` | 页脚/主题可用的社交链接 |
| `identity.repository` | 可选的 GitHub owner/name，用于页脚源码链接 |
| `locales.default` | 默认语言，必须存在于 `locales.entries` |
| `locales.entries.<lang>` | 该语言的 label、title、description、tagline |
| `site.url` | 生产 origin；CI 由 `SITE_URL` 覆盖 |
| `site.base` | 站点根路径；CI 由 `SITE_BASE` 覆盖 |
| `site.customDomain` | 自定义域名；设置后生成 `dist/CNAME` |
| `site.timezone` | 日期展示时区，默认 `Asia/Shanghai` |
| `site.license` | 页脚展示的代码/内容许可证 |
| `theme.name` | `folio` / `orbital` / `scholar` / `apogee` / `capstan` |
| `theme.config` | 主题自己的配置 |
| `home.layout` | `posts`（默认）首页是文章列表；`profile` 首页渲染一个页面（简历/自我介绍），文章列表移到 `/posts/` |
| `home.page` | `profile` 模式下作为首页的页面 slug，默认 `home`（即 `pages/home.md`）；该页面不再单独发布 |
| `nav` | 导航项，path 与语言无关 |
| `pagination.perPage` | 每页文章数 |
| `features.search` | 是否生成搜索页和索引 |
| `features.math` | 是否启用 KaTeX |
| `features.autoLanguage` | 首页按浏览器语言跳转，默认开启；手动语言选择会记住 |
| `features.publications` | 默认关闭；开启后 `pages/publications.md` 以 publications 布局发布在 `/publications/`，关闭时页面和导航项都不生成 |
| `markdown.allowHtml` | 是否允许原始 HTML（默认 false，开启时 sanitize） |

`features.autoLanguage` 只在默认语言首页读取 `navigator.languages`，按偏好顺序匹配第一个站点支持的语言；如果匹配的是默认语言就停留。每个标签页只自动跳转一次，文章、页面和其他语言首页不会自动重定向；语言切换链接会写入 localStorage，后续访问首页优先按手动选择。

### 个人主页布局

参考学术个人站的结构：首页放简介，文章、发表、分类、标签、归档各自一页。

```ts
home: { layout: 'profile', page: 'home' },
features: { publications: true },
nav: [
  { key: 'home', path: '/' },
  { key: 'publications', path: '/publications/' },
  { key: 'posts', path: '/posts/' },
  { key: 'categories', path: '/categories/' },
  { key: 'tags', path: '/tags/' },
  { key: 'archives', path: '/archives/' },
],
```

- 每种语言都要有 `content/<lang>/pages/<home.page>.md`，缺失会构建失败。
- 文章列表在 `/posts/`，分页为 `/posts/page/<n>/`；此模式下文章 slug 不能是 `page`。
- `/posts/` 导航项只在 `profile` 模式下出现；`/publications/` 导航项只在开关打开且页面存在时出现。
- 分类页 `/categories/` 和 `/categories/<slug>/` 总是生成，数据来自文章的 `categories` frontmatter。

主题配置由主题的 zod schema 校验。比如：

```ts
theme: {
  name: 'orbital',
  config: { accent: '#d99a4e', scanlines: true },
}
```

## 增加语言

1. 在 `site.config.ts` 的 `locales.entries` 增加语言代码和文案。
2. 创建 `content/<lang>/posts/` 和 `content/<lang>/pages/`。
3. 在每套主题的 `i18n/<lang>.yml` 补齐文案（主题一致性测试会检查）。
4. 保持 `translationKey` 一致，构建会自动生成 alternates、hreflang 和语言切换器。

默认语言保持在 `site.root`，其他语言自动加 `/<lang>/` 前缀。不要创建 `content/zh/` 之外的默认语言副本。

## 站点路径

- 用户页/组织页 `https://user.github.io`：`site.base: '/'`
- 项目页 `https://user.github.io/repo`：CI 自动注入 `SITE_BASE=/repo`；本地模拟用 `npx dxbe dev --base=/repo/`。Windows Git Bash 需要加 `MSYS_NO_PATHCONV=1`，否则 `/repo/` 会被转换成 Windows 路径。
- 自定义域名：`site.base: '/'`，`site.url` 是域名 origin

所有内部链接都经过 helper。主题里不要写死 `/assets/...` 或 `/posts/...`。

## 换主题

修改 `site.config.ts`：

```ts
theme: { name: 'scholar', config: {} }
```

或者临时预览：

```bash
npx dxbe dev --theme=scholar
```

主题名必须在 `themes/` 下存在。新增主题见 [theming.md](theming.md)。

## 删除示例内容

示例文章在：

```
content/zh/posts/how-this-site-works/
content/zh/posts/typography-notes/
content/en/posts/how-this-site-works/
content/en/posts/typography-notes/
```

删除这些目录后，保留或改写 `content/zh/pages/about.md` 和 `content/en/pages/about.md`，再运行 `npx dxbe check`。

## 仓库改名

项目页的 URL 会随仓库名变化。长期发布建议先绑定自定义域名，或在改名后保留旧路径的静态重定向页。GitHub Pages 没有服务端重定向。
