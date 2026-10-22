# 主题开发

主题是独立目录，核心只负责内容、路由和渲染数据，主题负责把数据变成 HTML。

`folio`、`orbital`、`scholar` 随 `dxbe` 包发布。博客仓库不需要复制它们；把自定义主题放在博客仓库的 `themes/<name>/`，同名主题会覆盖内置主题。

## 目录

```
themes/<name>/
  theme.json
  theme.ts
  config.ts
  layouts/
    index.ts
    post.ts
    page.ts
    archive.ts
    tag.ts
    tags.ts
    search.ts
    notFound.ts
    base.ts
    components.ts
  assets/
    css/site.css
    js/site.js
  i18n/
    zh.yml
    en.yml
```

`assets/css/site.css` 和 `assets/js/site.js` 是约定路径，核心会把它们暴露成 `ctx.assets.themeCss` 和 `ctx.assets.themeJs`。其他资源用 `ctx.helpers.asset('...')`。

## theme.json

```json
{
  "name": "folio",
  "version": "0.1.0",
  "apiVersion": 1,
  "entry": "./theme.ts",
  "assets": "./assets",
  "i18n": "./i18n"
}
```

`apiVersion` 目前只支持 `1`。不匹配时构建直接失败。

## theme.ts

```ts
import { defineTheme } from 'dxbe/theme'
import { z } from 'zod'
import { post } from './layouts/post.ts'

export default defineTheme({
  config: z.object({
    accent: z.string().default('#8a2f2f'),
    showToc: z.boolean().default(true),
  }),
  layouts: {
    post,
    // index, page, archive, tag, tags, search, notFound
  },
})
```

主题配置来自 `site.config.ts` 的 `theme.config`，由上面的 zod schema 校验。配置写错会直接构建失败。

## 上下文

布局函数接收 `ThemeContext`：

```ts
type LayoutFn = (ctx: ThemeContext) => string | SafeHtml
```

常用字段：

- `ctx.site`：标题、描述、作者、许可证、语言列表、base
- `ctx.page`：`{ kind, title }`，kind 是 `index | post | page | archive | tag | tags | search | notFound`
- `ctx.post` / `ctx.pageItem`：当前文章或页面
- `ctx.posts`：列表页的文章
- `ctx.tag` / `ctx.tags` / `ctx.archives` / `ctx.pagination`
- `ctx.toc`：标题数组；`ctx.tocHtml`：核心渲染好的目录 HTML
- `ctx.seo`：标题、描述、canonical、hreflang、OG 类型、JSON-LD
- `ctx.i18n`：`lang`、`label`、`t()`、当前页面的语言链接
- `ctx.assets`：主题 CSS/JS、KaTeX CSS、搜索脚本和索引地址
- `ctx.helpers`：URL、日期、资源、标签链接等
- `ctx.theme`：校验后的主题配置

## 模板

核心提供自动转义的 `html` 和用于预渲染内容的 `raw`：

```ts
import { html, raw } from 'dxbe/theme'

export const post: LayoutFn = (ctx) => html`
  <article>
    <h1>${ctx.post?.title}</h1>
    <div class="prose">${ctx.post?.html}</div>
  </article>
`
```

`ctx.post.html` 和 `ctx.tocHtml` 是 `SafeHtml`，可以直接插值；普通字符串会被转义。不要对已经渲染好的正文再调用 `html` 或手动拼接。

## 语言切换

内置主题在 `<head>` 里调用 `languageBootstrap(ctx)`，并给语言切换链接加 `data-language="<lang>"`。自定义主题要启用相同行为，需要：

```ts
import { html, languageBootstrap } from 'dxbe/theme'

// <head> 内
${languageBootstrap(ctx)}
// 语言链接
<a href="${ctx.helpers.url(alternate.url)}" data-language="${alternate.lang}">${alternate.label}</a>
```

`features.autoLanguage` 关闭或没有译文时，函数返回空内容。是否跳转、跳转到哪里由 `ctx.site.autoLanguage`、`ctx.i18n.alternates` 和默认语言决定；主题不需要自己写重定向逻辑。

## 布局回退

缺少布局时按下面的顺序回退：

- `post → page → 内置 fallback`
- `page → post → 内置 fallback`
- `tag → archive → index`
- `tags → archive → index`
- `search → index`
- `notFound → page → index`

回退会打印 warning。发布主题前应该补齐所有布局。

## 资源

- `assets/` 会复制到 `dist/assets/<theme>/`。
- `asset('css/extra.css')` 返回带 `base` 和内容哈希的 URL。
- 内置主题的 `assets/` 和 `i18n/` 由包的构建步骤复制到 `dist/themes/<name>/`。
- 资源缺失会抛 `THEME` 错误，不会静默输出坏链接。
- 主题 JS 写成原生 ESM；不要依赖打包器。
- 主题 CSS 使用普通 CSS；需要预处理器时在发布前自行编译。

## 文案

`i18n/<lang>.yml` 必须覆盖 `site.config.ts` 里配置的所有语言。核心使用的键至少有：

```
nav.label, nav.home, nav.archives, nav.tags, nav.about, nav.search
page.tags, page.archives, page.search, page.notFound
paginator.page
toc.title
```

缺 key 会打印 warning 并返回 key 本身。主题一致性测试会检查双语页面是否有 hreflang 和基本结构。

## 一致性测试

```bash
npx dxbe check:theme -- themes/my-theme
```

不传参数时遍历 `themes/` 下所有主题。测试会用固定内容构建，检查：

- 必需文件和布局存在
- `html[lang]`、title、canonical、`main`、一个 `h1`
- 双语的 hreflang
- 主题样式表存在
- 输出没有 `undefined` 或 `[object Object]`
- 构建结果路由不为空

## 新增主题

1. 复制 `themes/folio/` 到 `themes/<name>/`。
2. 修改 `theme.json` 的 `name`，修改 `theme.ts` 的配置 schema 和布局。
3. 在 `assets/css/site.css` 建立自己的排版系统。
4. 在 `i18n/` 补齐中英文。
5. 运行 `npx dxbe check:theme -- themes/<name>`。
6. 用 360 / 768 / 1280 / 1440 宽度和亮/暗模式检查截图。
7. 把截图和设计定位加到 `docs/theme-gallery.md`。

新增主题不需要改核心路由或 CI 配置，只要目录结构符合契约。
