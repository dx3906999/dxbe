# 静态博客系统 — 实施计划

- 版本：0.4（核心生成器、三套主题、CI/CD、文档已实现）
- 日期：2026-10-22
- 状态：Phase 0–4 已完成，Phase 5 部分完成
- 代码仓库：https://github.com/dx3906999/dxbe
- 生产地址：待定（GitHub Pages 或自定义域名）

## 0. 摘要

用 Node.js 24+ / TypeScript 实现静态站点生成器（SSG）。中文为默认语言，发布在站点根路径；英文发布在 `/en/`，不生成 `/zh/`，不做浏览器语言自动跳转。内容为 Markdown + YAML frontmatter，构建时完成渲染、Shiki 代码高亮、KaTeX 公式和 Pagefind 全文索引。主题是可替换的 TS 模块，带独立配置、静态资源、多语言文案和一致性测试。

站点身份全部配置化：作者、域名、仓库、语言、导航、许可证、主题都集中在 `site.config.ts`，不写死在代码或模板里。引擎作为 npm 包发布，博客仓库安装 `dxbe` 后运行 `dxbe setup` 填入自己的信息即可。内置三套完整主题：`folio`（编辑排版）、`orbital`（复古未来主义）、`scholar`（学术），不是换色皮肤。

CI 覆盖类型检查、Lint、测试、构建、链接、SEO 和主题契约；CD 通过 GitHub Actions artifact 发布到 GitHub Pages。预计 6 个阶段，按当前协作方式约 7–9 个批次完成。

## 实现状态

已完成：

- 引擎 npm 包化：单一 `dxbe` bin、tsup 构建、内置主题随包发布、博客仓库只依赖包
- 配置 schema、`site.config.ts` / `site.config.example.ts`、`dxbe setup`
- 内容扫描、frontmatter 校验、Markdown/Shiki/KaTeX 管线、Markdown 缓存
- 路由、分页、标签、归档、Atom、sitemap、robots、404、manifest
- 中文根路径 / 英文 `/en/`、译文关联、hreflang、语言切换器
- 三套主题：`folio`、`orbital`、`scholar`，均通过一致性测试
- 开发服务器、预览服务器、`npm run new`
- Pagefind 索引、按语言过滤、核心搜索脚本
- 内部链接、SEO、确定性构建、主题一致性检查
- CI、外链检查工作流、博客部署模板和 Dependabot 配置
- README、写作/主题/配置/部署/架构/设计检查文档和 ADR

待完成：

- 从 `dxbe` 模板创建博客仓库并开启 Pages（构建系统仓库不部署自身）
- 首次博客生产部署与部署后 smoke test
- Lighthouse CI、外链失败 issue 流程（可选）
- 生产域名的最终视觉验收

## 1. 目标与范围

### 1.1 目标

- 构建逻辑独立实现，不依赖 Hexo / Astro / Hugo / VitePress。
- 中文默认、根路径；英文 `/en/`；两种语言共用一套主题和路由实现。
- 支持标签、归档、分页、Atom、sitemap、robots、404、SEO/OG、JSON-LD。
- 支持构建时 KaTeX 数学公式、Pagefind 全文搜索、暗色模式。
- 主题可整体替换：目录、manifest、配置 schema、layouts、assets、i18n 五件套。
- 内置三套完整主题：`folio`（编辑排版）、`orbital`（复古未来主义）、`scholar`（学术），每套有自己的排版系统和布局逻辑。
- 站点身份、URL、语言、导航、许可证、主题选择全部配置化，不写死作者信息；博客仓库通过 npm 依赖 `dxbe` 复用引擎。
- 部署到 GitHub Pages，CI/CD 全自动，发布可回滚。
- 本地开发在 Windows 上顺畅，CI 在 Linux 上复现同一结果。

### 1.2 非目标（v1）

- 评论、后台 CMS、服务端搜索、阅读量、用户账户。
- 兼容 Hexo 主题（EJS/Pug + Hexo helper API）。
- Hexo 式 `{% %}` 标签、插件/渲染器体系、主题继承、主题市场。
- MDX、分类（v1 只做标签）、RTL、自动语言重定向。
- 多作者协作、草稿审批流、定时发布的可视化管理。
- AI 自动写文章、自动生成配图、自动摘要；引擎只渲染作者提供的内容。

### 1.3 硬约束

- Node 24 LTS 为 CI 基线；本地 Node 25 允许；`engines >= 24`。
- 客户端零框架；默认主题 `folio` 的 JS ≤ 15 KB（gzip），CSS ≤ 30 KB（gzip）。
- 构建确定性：同一输入两次构建，HTML/资源字节一致（Pagefind 索引除外）。
- GitHub Pages 静态托管，无服务端逻辑、无自定义响应头、无服务端重定向。
- 所有内部 URL 必须经过 helper，兼容项目页子路径 `/<repo>/`。
- 构建失败不得覆盖上一次成功的 `dist/`。
- 不提交 `dist/`、`.cache/`、`node_modules/`。

## 2. 已冻结的决策

| 项目 | 决策 |
|---|---|
| 运行时 | Node 24+，ESM，TypeScript 原生类型擦除 |
| 包管理 | npm，提交 `package-lock.json`，CI 用 `npm ci` |
| 内容格式 | Markdown + YAML frontmatter，一篇一目录 |
| 默认语言 | 中文，站点根路径 |
| 第二语言 | 英文，`/en/` |
| 主题形态 | TS 模块（函数式布局），不是 EJS/Pug |
| 内置主题 | `folio`（默认）、`orbital`、`scholar` |
| 站点身份 | 全部在 `site.config.ts`，代码和主题中不写死作者/域名/仓库 |
| 复用方式 | npm 依赖 `dxbe` + `dxbe setup` + `site.config.example.ts` |
| 引擎包名 | 暂定 `dxbe`，作为可复用引擎；站点实例靠配置区分 |
| 搜索 | Pagefind，构建后扫描 `dist/` |
| 数学 | KaTeX，构建时渲染 |
| 部署 | GitHub Actions artifact → GitHub Pages |
| 代码规范 | Biome（Lint + Format）+ `tsc --noEmit` |
| 测试 | Vitest；Playwright 仅做冒烟测试（可选） |
| 代码许可 | MIT |
| 内容许可 | CC BY-NC-SA 4.0（可在 `site.config.ts` 调整声明） |

### 2.1 URL 规则

中文（默认，站点根路径）：

```
/                         首页
/page/2/                  首页分页
/posts/<slug>/            文章
/tags/                    标签总览
/tags/<tag>/              标签页
/archives/                归档
/archives/2026/           按年归档
/search/                  搜索
/about/                   关于
/atom.xml                 Atom
/sitemap.xml              Sitemap
/robots.txt               Robots
/404.html                 404
```

英文：

```
/en/
/en/page/2/
/en/posts/<slug>/
/en/tags/
/en/tags/<tag>/
/en/archives/
/en/archives/2026/
/en/search/
/en/about/
/en/atom.xml
```

规则：

- 不生成 `/zh/`，避免重复内容和 canonical 歧义。
- 根路径永远是中文，不做 `Accept-Language` 或 `navigator.language` 自动跳转。语言切换交给页面上的显式链接。
- `hreflang`：中文页 `zh`，英文页 `en`，全站 `x-default` 指向中文根路径。
- canonical 指向页面自身；不跨语言指向。
- 所有链接以 `/` 结尾（`404.html`、`atom.xml`、`sitemap.xml`、`robots.txt` 除外），输出为目录 + `index.html`。
- 项目页部署时，站点根是 `https://<user>.github.io/<repo>/`，中文首页是 `/<repo>/`；`base` 由构建配置统一注入。
- 文章 slug 必须是 ASCII：`[a-z0-9]+(?:-[a-z0-9]+)*`。标签允许中文，URL 使用 NFC + 百分号编码，并做 slug 碰撞检查。

### 2.2 内容目录与 frontmatter

```
content/
  zh/
    posts/hello-world/index.md
    posts/hello-world/cover.jpg
    pages/about.md
  en/
    posts/hello-world/index.md
    pages/about.md
```

```yaml
---
title: 你好，世界          # 必填
date: 2026-10-22T10:00:00+08:00  # 必填，必须带时区
updated: 2026-10-23T09:00:00+08:00
tags: [随笔, 工程]
slug: hello-world         # 可选，默认目录名
translationKey: hello-world  # 可选，默认目录名
summary: 第一篇文章        # 可选，缺省从正文提取
draft: false              # 可选，默认 false
---
```

校验规则：

- frontmatter 使用 zod strict schema，未知字段直接报错（防拼写错误静默丢失）。
- `slug` 不符合 ASCII 规则时报错；同一语言内重复时报错。
- `translationKey` 在同一语言内唯一；跨语言重复是正常的。
- 日期必须能被 `Date.parse` 解析且包含时区偏移；缺时区报错。
- `draft: true` 在 production 构建中排除，在 dev 中显示并打标。
- 未来日期的文章在 production 中默认排除，可用 `--future` 覆盖。
- 正文图片使用相对路径，构建时把同目录资源复制到文章输出目录。
- 图片缺少 `alt` 时构建输出 warning（不阻断），主题一致性测试检查 `<img>` 是否有 `alt` 属性。
- 原始 HTML 默认关闭；打开时必须经过 `rehype-sanitize` allowlist。

### 2.3 多语言

- 配置：`languages: { default: 'zh', all: ['zh', 'en'] }`。
- 内容目录第一层就是语言代码；未知语言目录直接报错。
- `translationKey` 相同且语言不同的文章互为译文，生成 `alternates`。
- 没有译文的文章只出现在自己语言的列表、归档、feed 和搜索里。
- 语言切换器：
  - 文章页优先跳到对应译文。
  - 列表页/归档页跳到另一语言的同类页面。
  - 没有对应页面时退回另一语言首页，并保留可理解的标签。
- UI 文案来自主题 `i18n/<lang>.yml`，站点 `i18n/<lang>.yml` 可覆盖。主题必须为每个配置语言提供完整 key；缺 key 在主题一致性测试中失败。
- 日期展示用 `Intl.DateTimeFormat(lang, { timeZone: site.timezone })`，存储始终是带偏移的 ISO 字符串。
- 每个语言独立的 Atom、sitemap alternate、标签和归档。
- 搜索按语言过滤：`data-pagefind-filter="lang:zh"` / `lang:en`。
- `404.html` 使用中文；`/en/` 下缺失的路径由 GitHub Pages 返回同一个 404，页面内提供语言切换。

### 2.4 主题契约 v1

主题目录：

```
themes/<name>/
  theme.json
  theme.ts
  layouts/
    index.ts
    post.ts
    page.ts
    archive.ts
    tag.ts
    tags.ts
    search.ts
    notFound.ts
  assets/
    css/
    js/
  i18n/
    zh.yml
    en.yml
  preview.png
```

`theme.json`：

```json
{
  "name": "folio",
  "version": "1.0.0",
  "apiVersion": 1,
  "entry": "./theme.ts",
  "assets": "./assets",
  "i18n": "./i18n",
  "preview": "./preview.png"
}
```

`theme.ts`：

```ts
import { defineTheme, html, raw } from 'dxbe/theme'
import { z } from 'zod'

export default defineTheme({
  config: z.object({
    accent: z.string().default('#2563eb'),
    showToc: z.boolean().default(true),
    width: z.enum(['narrow', 'wide']).default('narrow'),
  }),
  layouts: {
    post: (ctx) => html`
      <article>
        <h1>${ctx.post.title}</h1>
        ${ctx.theme.showToc ? ctx.toc : ''}
        <div class="prose">${raw(ctx.post.html)}</div>
      </article>`,
    // index / page / archive / tag / tags / search / notFound
  },
})
```

#### 内置主题（三套，不是换色）

`folio` — 编辑排版，默认主题
- 定位：独立杂志 / 文学期刊的阅读页，不是 SaaS 落地页。
- 排版：高对比无衬线标题 + 衬线正文，或全衬线；大留白、细规则线、页码/期号式元信息；不用卡片、阴影、渐变。
- 颜色：暖白纸底 + 墨黑字 + 单一强调色；暗色模式是深墨底 + 米白字，不是纯黑。
- 细节：正文窄栏、目录贴边、脚注式引用、上下篇用文字链接，移动端保持同一阅读节奏。

`orbital` — 复古未来主义
- 定位：70 年代末技术手册 / 航天器操作界面 / CRT 终端，不是霓虹赛博朋克。
- 排版：等宽字体做元信息和导航，窄体或几何无衬线做标题；细网格、坐标刻度、编号章节。
- 颜色：深墨蓝或炭黑底 + 磷光琥珀/暖绿强调 + 米白文字；浅色模式是泛黄的技术纸。
- 细节：轻微扫描线或噪点（可关闭，尊重 `prefers-reduced-motion`），1px 实线边框，不用发光阴影堆叠；目录和搜索像仪表盘。
- 禁止：紫色渐变、霓虹粉青、玻璃拟态、通用“太空插画”。

`scholar` — 学术
- 定位：期刊论文 / 学位论文的阅读体验，不像博客模板。
- 排版：衬线正文、窄栏、编号章节、摘要、脚注/边注、图表 caption、参考文献列表、打印样式。
- 颜色：近黑白单色，链接用深蓝或酒红，不用彩色卡片。
- 细节：数学公式优先排版；目录像论文大纲；作者/日期/来源元信息克制；移动端边注折叠为脚注。
- 禁止：伪造期刊名、DOI、引用和数据；没有真实来源就不放引用块。

三套主题共享同一套契约、路由和 i18n key，只替换 layouts、assets 和主题配置。每套都要通过一致性测试和 360/768/1280/1440 的视觉检查；不能只改颜色就当作新主题。

契约：

- **职责边界**：核心负责内容、路由、分页、feed、sitemap、404、SEO 数据；主题只渲染 HTML，不能新增或修改 URL。
- **上下文**：`ctx` 是按页面类型区分的联合类型（`index | post | page | archive | tag | tags | search | notFound`），每种页面拿到精确的数据类型。
- **模板**：布局是 `(ctx) => string` 的同步函数。核心提供自动转义的 `html` 和用于已渲染内容的 `raw`；复用通过 ESM import，不需要 partial 加载器。
- **布局回退**：`notFound → page → built-in fallback`，`post → page → built-in fallback`，`tag → archive → index`，`tags → archive → index`，`index → built-in fallback`。回退时打印 warning。
- **配置**：主题导出 zod schema，`site.config.ts` 的 `theme.config` 在构建时解析；未知字段和类型错误直接失败。
- **资源**：主题的 `assets/` 复制到 `dist/assets/<theme>/`；`asset('css/site.css')` 返回带内容哈希查询串的 URL，例如 `/assets/folio/css/site.css?v=8f3a1c`。
- **文案**：主题 `i18n/` 提供每个语言的完整 key；`ctx.i18n.t('post.readMore')` 支持 `{count}` 插值。
- **版本**：`apiVersion` 不匹配直接拒绝构建。
- **分发**：v1 只支持 `themes/` 本地目录；推荐用 git submodule 管理第三方主题。npm 包和主题市场后置。
- **不做**：插件/渲染器体系、`{% %}` 标签、主题继承、主题内自建构建流程。主题需要 JS 就写原生 ESM，需要 CSS 就写原生 CSS。
- **一致性测试**：`npm run check:theme -- themes/folio themes/orbital themes/scholar` 用固定 fixture 构建，检查：
  - 所有必需布局存在且能渲染；
  - `<!doctype html>`、`<html lang>`、`<title>`、description、canonical；
  - `hreflang` 与 `x-default`；
  - Atom link、搜索容器；
  - 一个 `<main>`、一个 `<h1>`、无重复 id；
  - 内部链接和资源全部可解析；
  - 双语 fixture 的语言切换链接正确；
  - 数学页面只在 `hasMath` 时引入 KaTeX CSS；
  - 输出不含 `undefined`、`[object Object]`。

### 2.5 搜索

- Pagefind 在构建后运行：`pagefind --site dist --output-subdir pagefind`。
- 文章正文容器加 `data-pagefind-body`；导航、目录、相关文章、页脚加 `data-pagefind-ignore`。
- 文章容器加 `data-pagefind-filter="lang:zh"` 或 `lang:en`。
- 索引排除 `pre` 和 `.katex`，避免代码和公式污染结果。
- 主题的 `search` 布局只提供容器；核心提供 `assets/search.js`，负责懒加载索引、防抖、`?q=` 同步、键盘导航和结果高亮。样式类名由主题定义。
- 搜索页：`/search/` 与 `/en/search/`；无 JS 时显示说明和站内链接。
- 子路径部署时，Pagefind 资源通过 `url('/pagefind/pagefind.js')` 加载，不能写死 `/pagefind/`。
- 预留适配层：如果将来替换索引实现（`Intl.Segmenter` + 中文 bigram 倒排），只替换 `search.js`，主题无感。
- 开发模式下 Pagefind 索引按需重建；如果重建慢，提供 `npm run index` 手动触发。

### 2.6 数学公式

- `remark-math` + `rehype-katex`，构建时输出 HTML + MathML，客户端零 JS。
- 解析时标记 `hasMath`；主题仅在需要时引入 KaTeX CSS。
- KaTeX CSS 与字体放在共享的 `dist/assets/vendor/katex/`，不随主题重复打包。
- `throwOnError: true`：构建失败并输出文件路径、行号和公式片段。
- `$...$` 与 `$$...$$` 都支持；货币符号使用 `\$` 转义。代码块内的 `$` 不受影响。
- 搜索索引排除 `.katex`，避免符号串进入正文结果。

### 2.7 站点配置与模板复用

目标是“一个引擎，多个站点”，而不是只为当前仓库写死的一套代码。

- `site.config.ts` 是唯一的站点身份来源。作者、域名、仓库、语言、标题、描述、导航、许可证、主题都在这里。
- 代码、主题、i18n 文案中不允许出现作者姓名、GitHub 用户名、仓库名、域名。
- 主题只读取 `ctx.site.*`、`ctx.i18n.*`、`ctx.site.license` 等注入值。
- 英文站点信息不是翻译中文，而是 `locales.entries.en` 下独立配置。
- `site.config.example.ts` 提供完整注释和占位值；`dxbe setup` 生成或更新 `site.config.ts`。
- 博客仓库只安装 `dxbe` 依赖，放 `content/`、`site.config.ts`、`public/` 和部署工作流；引擎和内置主题不复制。

配置形态：

```ts
export default defineConfig({
  identity: {
    author: { name: '', email: '', url: '', avatar: '' },
    social: [{ label: 'GitHub', url: '' }],
    repository: { owner: '', name: '' }, // 可选：页脚源码链接、本地 base 推导
  },
  locales: {
    default: 'zh',
    entries: {
      zh: { label: '中文', title: '', description: '', tagline: '' },
      en: { label: 'English', title: '', description: '', tagline: '' },
    },
  },
  site: {
    url: 'https://example.com', // SITE_URL 环境变量可覆盖
    base: '/',                  // 项目页由 SITE_BASE 覆盖，例如 /my-blog/
    customDomain: undefined,    // 设置后生成 dist/CNAME
    timezone: 'Asia/Shanghai',
    license: { code: 'MIT', content: 'CC BY-NC-SA 4.0' },
  },
  theme: { name: 'folio', config: {} },
  nav: [
    { key: 'home', path: '/' },
    { key: 'archives', path: '/archives/' },
    { key: 'tags', path: '/tags/' },
    { key: 'about', path: '/about/' },
  ],
  pagination: { perPage: 10 },
  features: { search: true, math: true },
})
```

`npm run setup`：

- 纯 Node `readline` 实现，不引入交互式框架。
- 询问：作者名、邮箱、主页、社交链接、中文标题/描述、英文标题/描述、站点 URL、语言列表、默认主题、许可证。
- 支持 `--yes` + flags 的非交互模式，方便脚本和 CI。
- 写入前用 zod 校验；已存在 `site.config.ts` 时默认不覆盖，确认后才备份并重写。
- 可选 `--post` 同时生成第一篇内容，避免新用户面对空目录。
- 失败时给出具体字段和示例值，不打印整段堆栈。

URL 与仓库解耦：

- CI 用 `actions/configure-pages` 的 `origin` / `base_path` 自动注入，不读取仓库名硬编码。
- `identity.repository` 只用于展示和本地推导；生产部署以 `configure-pages` 的输出为准，避免仓库改名后配置过期。
- 本地默认 `http://localhost:4000` 和 `/`；项目页本地预览用 `npm run dev -- --base=/my-blog/`。
- 自定义域名由 `site.customDomain` 生成 `dist/CNAME`，同时作为 canonical 的 host；`public/CNAME` 仍可覆盖。
- 生产构建如果检测到 `url` 仍是 `example.com` 或 `localhost`，直接失败并提示配置，防止把占位域名发上线。

文档与模板：

- `docs/customization.md`：配置字段、语言、域名、主题切换、内容迁移。
- `README.md`：构建系统开发用 `npm ci` → `npm run dev`；博客实例用 `npm install github:dx3906999/dxbe` → `dxbe setup` → `dxbe dev`。
- `docs/authoring.md` 和 `docs/theming.md` 不出现当前作者的私人信息，示例使用中性作者名。
- 内容目录附 `content/README.md`，说明哪些是示例、可以整体删除。

## 3. 架构

```
.
├─ .github/
│  ├─ workflows/{ci,deploy,external-links}.yml
│  └─ dependabot.yml
├─ content/{zh,en}/{posts,pages}
├─ themes/{folio,orbital,scholar}
├─ src/
│  ├─ cli/{build,dev,preview,new,clean}.ts
│  ├─ core/
│  │  ├─ config.ts
│  │  ├─ content/{scan,frontmatter,markdown,model,validate}.ts
│  │  ├─ routes/{index,post,tag,archive,search,notfound}.ts
│  │  ├─ render.ts
│  │  └─ outputs/{atom,sitemap,robots,manifest}.ts
│  ├─ theme/{api,loader,assets,i18n,conformance}.ts
│  ├─ search/pagefind.ts
│  ├─ assets/{search.js,search.css?}
│  └─ shared/{html,url,date,errors,logger}.ts
├─ scripts/{check-links,check-seo,check-theme,smoke,new-post,setup}.ts
├─ tests/{unit,integration,fixtures}
├─ public/{.nojekyll,CNAME?,favicon.ico,og-default.png}
├─ docs/{plan,architecture,authoring,theming,customization,deployment,adr}
├─ site.config.ts
├─ site.config.example.ts
├─ package.json
├─ tsconfig.json
├─ biome.json
├─ vitest.config.ts
├─ .editorconfig
├─ .gitattributes
├─ .gitignore
├─ .nvmrc
├─ LICENSE
└─ README.md
```

构建流水线：

```
写配置 → 扫描 content → frontmatter 校验 → Markdown 转换（缓存）
→ 构建内容模型（语言、译文、标签、归档、上下篇）
→ 生成路由表 → 逐页渲染（主题 layouts）→ 写入临时目录
→ 生成 atom/sitemap/robots/manifest → 页面校验
→ Pagefind 建索引 → 原子替换 dist/
```

模块职责：

- `core`：纯函数和数据结构，不直接读环境变量、不打印日志、不写文件。
- `cli`：参数解析、I/O、日志、退出码。
- `theme`：加载主题、校验配置、解析布局、复制资源、提供 helper。
- `scripts`：CI 与发布使用的独立校验工具。
- `shared`：HTML 转义、URL 拼接、日期、错误类型、日志接口。

实现顺序：

1. 配置与内容扫描。
2. Markdown 管线与模型。
3. 路由与 `folio` 主题。
4. 输出（Atom/sitemap/robots/404）。
5. 主题加载器与资源管线。
6. dev server 与热刷新。
7. 多语言路由。
8. 搜索与数学。
9. 校验脚本与 CI。

### 3.1 缓存

- Markdown 转换结果按 `sha256(source + pipelineVersion + relevantConfig)` 存入 `.cache/markdown/<hash>.json`。
- 缓存内容：HTML、headings、hasMath、摘要文本、阅读时长。
- 主题改动不使 Markdown 缓存失效。
- 构建结束后输出缓存命中率；CI 不依赖缓存，保证冷构建也能通过。
- 不使用“增量构建”；只做单文件转换缓存。

### 3.2 开发服务器

- `npm run dev`：构建 → 监听 `content/`、`themes/`、`src/`、`site.config.ts`、`public/`、`i18n/` → 重建 → SSE 刷新。
- 100ms 防抖；构建错误显示覆盖层，服务器保持运行。
- 草稿和未来文章可见，并带 `DRAFT` 标记。
- 端口 4000，占用时自动递增。
- 支持 `--base=/repo/` 模拟项目页路径。
- `npm run preview` 只服务 `dist/`，用于本地验收。

### 3.3 构建产物

- `dist/` 是完整静态站点，包含 `index.html`、`404.html`、`atom.xml`、`sitemap.xml`、`robots.txt`、`pagefind/`、`assets/`。
- 构建先写入 `.build-tmp/`，校验通过后替换 `dist/`；失败时保留上一次成功的 `dist/`。
- 生成 `dist/build-manifest.json`：路由列表、文章数、语言数、构建耗时、内容哈希，供 smoke test 和排查使用。不加入 sitemap。
- 所有资源带内容版本；HTML 不缓存版本，依赖 GitHub Pages 的短 TTL。

## 4. 工程规范

### 4.1 语言与代码

- TypeScript `strict: true`，并开启 `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitOverride`、`verbatimModuleSyntax`、`erasableSyntaxOnly`。
- ESM + `NodeNext`；只使用 `node:` 前缀的内置模块。
- 不使用路径别名，避免 Node 运行时解析差异。
- `core` 不产生副作用；I/O 集中在 `cli` 和 `scripts`。
- 不使用 `any`；跨模块数据用显式类型和 zod 边界校验。
- 默认导出仅用于主题入口和 `site.config.ts`；其余使用命名导出。
- 禁止循环依赖；`core` 不能 import `theme`，`theme` 不能 import `core` 内部模块，只能 import 公共 API。

### 4.2 内容与 URL

- URL 规则一旦发布不随意修改；slug 变更必须在 PR 中说明影响。
- 标签改名会产生新 URL，需要保留旧标签页的静态重定向或别名（后续功能）。
- 所有输出路径统一由 `buildUrl()` 生成，禁止主题手写 `href="/..."`。
- 文件名大小写敏感：slug、标签 slug、资源名统一小写。
- 中文标签 URL 使用 NFC 规范化和百分号编码；构建时检测不同 Unicode 形式造成的碰撞。

### 4.3 错误处理与日志

```ts
class BuildError extends Error {
  code: 'CONFIG' | 'CONTENT' | 'MARKDOWN' | 'THEME' | 'OUTPUT'
  file?: string
  line?: number
  hint?: string
}
```

- 配置错误、内容错误、主题错误、输出错误都以 `BuildError` 抛出，CLI 统一格式化。
- 一次构建收集所有 warning，结束时汇总打印；fatal error 立即退出，退出码 1。
- 错误信息必须包含文件路径、语言、slug、可执行的修复建议。
- 日志分级：`error` / `warn` / `info` / `debug`；`--verbose` 开启 debug。
- 禁止在 `core` 中使用 `console.log`；通过注入的 logger 输出。

### 4.4 确定性

- 文章排序：日期倒序，日期相同按 slug 升序。
- 标签、归档、分页使用显式稳定排序，不依赖 `localeCompare` 的隐式 locale。
- 输出中不写入构建时间；`lastmod` 使用文章 `updated` 或 `date`。
- JSON 输出使用稳定 key 顺序。
- CI 增加确定性检查：连续构建两次（不运行 Pagefind），比较 HTML/资源哈希；Pagefind 索引不参与比较。

### 4.5 测试策略

- 单元测试：URL 拼接、base path、日期、slug、frontmatter、i18n fallback、分页、摘要、阅读时长、布局回退。
- 集成测试：用 `tests/fixtures/site` 构建完整站点，断言路由表、关键 HTML、Atom、sitemap、404、双语 alternates、base path。
- 快照测试：只对关键片段（head、文章头、分页）做快照，避免整页快照噪音。
- 主题一致性测试：三套主题跑同一 fixture。
- 链接检查：内部链接、锚点、资源、大小写、base path。
- SEO 检查：title、description、canonical、hreflang、x-default、OG、JSON-LD、sitemap、Atom。
- 冒烟测试（可选）：Playwright 验证搜索、语言切换、数学公式、暗色模式、移动端导航。
- 覆盖率：`core/` 行覆盖 ≥ 70%，不把覆盖率作为唯一目标。

### 4.6 质量门禁

本地与 CI 共用同一组命令；`npm run check` 是默认门禁，CI 额外跑确定性检查：

```
biome check .
tsc --noEmit
vitest run --coverage
npm run build
npm run check:links
npm run check:seo
npm run check:theme -- themes/folio themes/orbital themes/scholar
pagefind --site dist --output-subdir pagefind
```

补充命令：

```json
{
  "scripts": {
    "dev": "node src/cli/dev.ts",
    "build": "node src/cli/build.ts",
    "preview": "node src/cli/preview.ts",
    "new": "node src/cli/new.ts",
    "clean": "node src/cli/clean.ts",
    "index": "pagefind --site dist --output-subdir pagefind",
    "build:finish": "npm run check:output && npm run index",
    "build:all": "npm run build && npm run build:finish",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "check:links": "node scripts/check-links.ts",
    "check:seo": "node scripts/check-seo.ts",
    "check:output": "npm run check:links && npm run check:seo",
    "check:theme": "node scripts/check-theme.ts",
    "check:deterministic": "node scripts/check-deterministic.ts",
    "verify": "npm run lint && npm run typecheck && npm run test",
    "check": "npm run verify && npm run build && npm run check:output && npm run check:theme && npm run index"
  }
}
```

规则：

- 任何一项失败都阻止合并和部署。
- 校验脚本不能只存在于 CI；本地必须可运行。
- 新增功能必须同时新增或更新测试。
- 主题改动必须跑 `check:theme`；不传参数时遍历 `themes/` 下所有主题，传参只检查指定主题。
- 内容改动必须通过 frontmatter 校验和链接检查。

### 4.7 文档与 ADR

- `README.md`：项目简介、快速开始、脚本、目录说明、部署入口；首屏写清 “Use this template”。
- `docs/architecture.md`：模块边界、数据流、扩展点。
- `docs/customization.md`：站点配置、模板复用、语言、主题、域名、`npm run setup`。
- `docs/authoring.md`：frontmatter、图片、标签、多语言、公式写法。
- `docs/theming.md`：主题 manifest、context、helper、资源、i18n、一致性测试。
- `docs/design-review.md`：三套主题的视觉验收清单（§4.12）。
- `docs/theme-gallery.md`：三套主题的截图、设计定位和选择建议。
- `docs/deployment.md`：Pages 设置、自定义域名、回滚、常见故障。
- `docs/adr/`：关键决策记录，至少包括：
  - 0001 主题 API 使用 TS 函数而非模板语言
  - 0002 中文根路径 / 英文 `/en/`
  - 0003 Pagefind 作为搜索索引
  - 0004 GitHub Pages artifact 部署
  - 0005 KaTeX 构建时渲染
- 每个阶段结束更新对应文档；不接受“代码即文档”。

### 4.8 Git 与协作

- 主干开发：`main` 始终可部署；功能分支 + PR。
- Conventional Commits：`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `build:`, `ci:`, `chore:`。
- PR 描述包含：变更内容、验证方式、对 URL/主题 API 的影响。
- 开启分支保护：要求 CI 通过、禁止 force push、禁止删除 `main`。
- `.gitattributes` 统一 LF；`.editorconfig` 统一缩进和换行。
- 不提交生成物；`dist/`、`.cache/`、`node_modules/` 全部忽略。
- 依赖变更必须提交 lockfile，并在 PR 中说明原因。

### 4.9 可访问性

- 三套主题都要有：skip link、landmarks、可见 focus、`aria-current`、语义化标题层级。
- 对比度达到 WCAG AA；暗色模式单独校验。
- `prefers-reduced-motion` 下关闭非必要动画。
- 搜索结果为 live region；键盘可完成打开、输入、选择、跳转。
- 数学公式使用 KaTeX 的 MathML 输出。
- 内容图片构建时检查 `alt`；主题一致性测试检查 `<img alt>`。
- 页面必须有 `<html lang>`；语言切换链接带目标语言名称。

### 4.10 性能预算

- 每套主题首屏：HTML ≤ 60 KB（不含正文），CSS ≤ 30 KB gzip，JS ≤ 15 KB gzip。
- 图片：默认 `loading="lazy"`、`decoding="async"`，首屏图除外；后续用 sharp 生成 AVIF/WebP 多尺寸。
- 字体：优先系统字体；引入中文 Web Font 时按 unicode-range 子集化，禁止全量 5 MB 字体。
- 构建：单篇文章 Markdown 转换缓存；Shiki 高亮器单例；并发转换限制 8。
- Lighthouse：performance ≥ 90（warn），accessibility/best-practices/SEO ≥ 95（error）。
- 不在首屏引入第三方脚本；分析工具默认不接入。

### 4.11 安全与隐私

- 内容默认不解析原始 HTML；开启时必须 `rehype-sanitize`。
- 所有插值默认转义；只有明确标记的 `SafeHtml` 走 `raw`。
- 不把密钥写入仓库；需要配置时用 GitHub Actions Variables，不用 Secrets（静态站无需密钥）。
- GitHub Actions 使用最小权限；禁止 `pull_request_target`；fork PR 不接触部署环境。
- 依赖保持精简；Dependabot 每周更新；启用手动审查。
- 默认不接入第三方分析、评论、字体 CDN；需要时单独评估隐私影响。

### 4.12 设计原则：避免模板化与 AI 味

“AI 味”不是指用了 AI，而是指结果呈现出一眼可见的默认模板特征：紫色渐变、玻璃卡片、emoji 标题、空泛文案、无差别圆角和阴影、伪造的引用与数据。三套主题都必须通过下面这张清单。

视觉：

- 先定排版系统（字体、栅格、行宽、层级），再定颜色；不能只换色。
- 禁用：紫色/蓝色渐变 hero、玻璃拟态、漂浮光斑、通用 3D 插画、无意义图标堆叠、所有卡片同一圆角。
- 个性来自排版和细节：`folio` 的细线与留白、`orbital` 的等宽元信息与网格、`scholar` 的边注与编号。
- 颜色控制在一个强调色 + 两个中性色以内；暗色模式单独设计，不是简单反色。
- 纹理和动效只做低强度、可关闭的细节；尊重 `prefers-reduced-motion`。
- 图片使用作者自己的照片、真实截图或 CSS 几何图形；不使用 AI 生成的通用插画。

文案：

- UI 文案短、具体、可操作：“上一页”“没有结果”“复制链接”，不写“探索更多精彩内容”。
- 示例文章写具体的技术内容或排版说明，不写“欢迎来到我的博客，这里记录我的学习与成长”。
- 不伪造个人经历、数据、引用、期刊名、DOI。
- 标题不用 emoji 装饰；正文不用“在这个快速发展的时代”这类填充句。
- 中英文分别撰写，不做逐字直译；英文不要出现中式营销腔。

代码与文档：

- 注释只解释约束和原因，不写逐行说明；不写“This function does X”这种噪音。
- README 直接给安装、配置、写作、部署路径，不写愿景口号。
- 提交信息具体，例如 `feat(theme): add orbital table of contents`，不写 `update files`。
- 主题预览图用真实截图，不用生成的概念图。

验收：

- 三套主题截图并排时能一眼看出布局差异，而不是同一页面换色。
- 遮住 logo 和颜色后，仍能通过排版辨认主题。
- 长中文、长英文、无图文章、代码块、公式、表格六种内容都要检查。
- 移动端 360px 下不出现横向滚动、标题孤行、目录遮挡。
- 设计审查清单通过后才合并主题。

## 5. CI/CD

### 5.1 流水线总览

| 工作流 | 触发 | 作用 |
|---|---|---|
| `ci.yml` | PR、push main、手动 | 在 Ubuntu + Windows 上跑 `npm run check` |
| `templates/deploy.yml` | 博客仓库复制后使用 | 校验、生产构建、Pagefind、上传 artifact、部署 Pages、冒烟测试 |
| `external-links.yml` | 每周一、手动 | 外部链接检查，失败创建 issue（不阻塞 PR） |
| Dependabot | 每周 | npm 与 GitHub Actions 更新 PR |

原则：

- 部署只从 `main` 触发，PR 永不部署。
- CI 与本地执行同一套 `npm run check`。
- 部署前必须通过校验；不使用 `--no-verify` 之类的跳过开关。
- 构建产物只包含 `dist/`，不包含源码和 `node_modules`。

### 5.2 `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    name: check (${{ matrix.os }})
    runs-on: ${{ matrix.os }}
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest]
    env:
      SITE_URL: https://example.com
      SITE_BASE: /
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run check
      - name: Deterministic build
        if: matrix.os == 'ubuntu-latest'
        run: npm run check:deterministic
      - name: Lint workflows
        if: matrix.os == 'ubuntu-latest'
        uses: raven-actions/actionlint@v2
      - name: Upload dist for debugging
        if: always() && matrix.os == 'ubuntu-latest'
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist
          retention-days: 3
          if-no-files-found: ignore
```

### 5.3 `templates/deploy.yml`

构建系统仓库本身不运行这个工作流；博客仓库创建后复制到 `.github/workflows/deploy.yml`。

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run verify
      - run: npm run check:theme -- themes/folio themes/orbital themes/scholar
      - id: pages
        uses: actions/configure-pages@v5
      - name: Build
        env:
          SITE_URL: ${{ steps.pages.outputs.origin }}
          SITE_BASE: ${{ steps.pages.outputs.base_path }}
        run: npm run build
      - run: npm run build:finish
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
          retention-days: 1

  deploy:
    needs: build
    runs-on: ubuntu-latest
    timeout-minutes: 10
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - id: deployment
        uses: actions/deploy-pages@v4
      - name: Post-deploy smoke test
        env:
          BASE_URL: ${{ steps.deployment.outputs.page_url }}
        run: node scripts/smoke.ts
```

说明：

- `configure-pages` 提供 `origin` 和 `base_path`，构建配置据此生成 canonical、sitemap、Atom 和所有内部链接。
- 项目页的 `base_path` 形如 `/repo`，配置层统一规范化为 `/repo/`。
- 自定义域名时若 `origin` 不符合预期，用仓库变量 `SITE_URL_OVERRIDE` / `SITE_BASE_OVERRIDE` 覆盖。
- `concurrency` 使用 `cancel-in-progress: false`，避免取消正在进行的生产部署。
- `build:finish` 包含 Pagefind 索引和链接/SEO 校验。
- 冒烟测试在部署后执行，覆盖 `/`、`/en/`、`/atom.xml`、`/sitemap.xml`、`/404.html`、`/pagefind/pagefind.js` 和一个 sitemap 中的文章 URL；带重试，等待 CDN 生效。

### 5.4 可选流水线

**外部链接检查**（每周，不阻塞 PR）：

```yaml
name: External links
on:
  schedule:
    - cron: '0 3 * * 1'
  workflow_dispatch:
permissions:
  contents: read
  issues: write
jobs:
  lychee:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: lycheeverse/lychee-action@v2
        with:
          args: --no-progress --max-concurrency 8 'content/**/*.md'
          fail: false
      # 失败时用 lychee 输出创建/更新 issue
```

**Lighthouse CI**（PR 或 main，可选）：用 `treosh/lighthouse-ci-action` + `staticDistDir: ./dist`；performance 设为 warn，其余为 error。若影响 PR 速度，只在 main 或每日计划运行。

### 5.5 缓存、并发、权限

- npm 缓存由 `setup-node` 的 `cache: npm` 管理。
- 不缓存 `.cache/` 作为 CI 成功的前提；冷构建必须通过。
- CI 并发按 ref 分组并取消旧运行；部署并发固定为 `pages`，不取消。
- CI 权限只有 `contents: read`；部署额外需要 `pages: write` 和 `id-token: write`。
- 不在 workflow 中使用 `pull_request_target`；不接受来自 fork 的部署。
- 第三方 action 尽量使用官方 action；Dependabot 负责升级。

### 5.6 回滚与发布

- 每次部署对应一个 commit；GitHub Pages 保留部署历史。
- 回滚优先使用 GitHub Pages 的“重新运行”旧部署，或在旧 commit 上手动触发 `deploy.yml`。
- 重要版本打 tag（`v0.1.0`），tag 只标记，不触发额外发布流程。
- 发布后检查 Actions 的 smoke test；失败时立即回滚。
- 不做自动版本号递增；生成器版本在 `package.json` 手动维护。

## 6. GitHub Pages 发布要求

### 6.1 仓库与 Pages 设置

- [ ] 仓库为 public（免费计划下 Pages 只支持 public 仓库；private 需要 Pro/Team/Enterprise）。
- [ ] 默认分支为 `main`。
- [ ] Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。
- [ ] Settings → Actions → General → Workflow permissions：默认只读；workflow 内按需声明 `pages: write`、`id-token: write`。
- [ ] Environment `github-pages` 已创建；限制部署分支为 `main`。
- [ ] 分支保护：`main` 要求 `check (ubuntu-latest)` 和 `check (windows-latest)` 通过，禁止 force push 和删除。
- [ ] 开启 Dependabot alerts、Dependabot security updates、secret scanning。
- [ ] 仓库设置：description、topics、homepage、社交预览图。

### 6.2 产物要求

- [ ] `dist/index.html` 存在。
- [ ] `dist/.nojekyll` 存在，禁用 Jekyll（否则下划线开头的文件会被忽略）。
- [ ] `dist/404.html` 存在；GitHub Pages 对未知路径返回它。
- [ ] `dist/robots.txt` 和 `dist/sitemap.xml` 存在，URL 是绝对地址且包含正确的 `base`。
- [ ] `dist/atom.xml` 存在，包含绝对链接。
- [ ] `dist/pagefind/pagefind.js` 存在，搜索页能在子路径下加载。
- [ ] 所有资源是可复制的真实文件；不使用符号链接。
- [ ] 站点总大小 < 1 GB（GitHub Pages 软限制），单次构建 < 10 分钟。
- [ ] 图片已压缩；不把视频或大二进制文件放进 Pages。

### 6.3 路径与 URL

- [ ] 项目页 `https://<user>.github.io/<repo>/` 使用 `base: '/<repo>/'`；用户页/组织页使用 `/`。
- [ ] canonical、OG、Atom、sitemap 全部使用 `SITE_URL + base + path`。
- [ ] 所有内部链接经 `url()` helper，主题中不出现写死的根路径。
- [ ] URL 大小写敏感；slug、标签 slug、资源名统一小写。
- [ ] 目录 URL 以 `/` 结尾；生成 `index.html`；不输出无扩展名的裸文件。
- [ ] 仓库改名会改变项目页 base；需要先配置自定义域名或保留重定向页。

### 6.4 自定义域名（可选）

- [ ] `public/CNAME` 写入域名，构建时复制到 `dist/CNAME`。
- [ ] DNS：子域名 CNAME 到 `<user>.github.io`；根域名配置 GitHub Pages 的 A/AAAA 记录。
- [ ] Settings → Pages → Custom domain 填写域名，等待 DNS 检查通过。
- [ ] 开启 Enforce HTTPS；证书签发可能需要等待。
- [ ] 自定义域名下 `base` 为 `/`，`SITE_URL` 使用自定义域名。
- [ ] 保留 `www` 与非 `www` 的单一 canonical 策略，避免重复内容。

### 6.5 GitHub Pages 的平台限制

- 1 GB 发布站点大小、100 GB/月带宽、10 次构建/小时的软限制。
- 没有服务端重定向、没有自定义响应头、没有动态路由。
- HTML 通过 CDN 缓存，更新可能有约 10 分钟延迟；资源用内容哈希避开旧缓存。
- 私有仓库的 Pages 需要付费计划。
- Actions 对 public 仓库免费；private 仓库消耗额度。
- Pages 不支持 PR 预览；需要预览时后续接 Cloudflare Pages 或本地 `npm run preview`。

### 6.6 发布前检查清单

- [ ] `npm run check` 本地通过。
- [ ] CI 在 Ubuntu 和 Windows 上通过。
- [ ] 构建确定性检查通过（Pagefind 除外）。
- [ ] 内部链接、锚点、资源全部可解析。
- [ ] SEO 检查通过：title、description、canonical、hreflang、x-default、OG、JSON-LD。
- [ ] 三套主题通过一致性测试，且视觉评审通过。
- [ ] 中文根路径和 `/en/` 都能正常访问，语言切换正确。
- [ ] 数学公式页面渲染正常，未引入多余 KaTeX CSS。
- [ ] 搜索在子路径下可用，中文和英文结果不串。
- [ ] `404.html`、`atom.xml`、`sitemap.xml`、`robots.txt` 可访问。
- [ ] 部署后的 smoke test 通过。
- [ ] 移动端、暗色模式、键盘导航检查通过。
- [ ] Lighthouse 达到预算。

## 7. 里程碑与验收

| 阶段 | 内容 | 验收 | 预计 |
|---|---|---|---|
| Phase 0 | 仓库骨架、规范、CI、Pages 空站部署 | CI 双平台通过；Pages 子路径可访问；`npm run check` 可跑 | 0.5–1 天 |
| Phase 1 | 内容管线、路由、`folio` 主题、Atom/sitemap、dev server | 中文博客可完整浏览；链接/SEO 校验通过 | 1.5–2 天 |
| Phase 2 | 多语言：根路径中文、`/en/`、译文关联、语言切换 | 双语构建；hreflang/canonical 正确；无 `/zh/` | 1 天 |
| Phase 3 | 主题契约固化、资源哈希、三套主题、一致性测试 | 三套主题均可切换并通过 conformance；视觉评审通过 | 1.5–2 天 |
| Phase 4 | Pagefind 搜索、KaTeX 数学 | 双语搜索可用；公式渲染；索引排除代码/公式 | 1 天 |
| Phase 5 | 质量门禁、Lighthouse、外链、文档、发布验收 | 所有门禁通过；生产 smoke test 通过 | 0.5–1 天 |

### Phase 0 — 仓库与部署骨架

- 初始化 git、`package.json`、`tsconfig.json`、`biome.json`、`vitest.config.ts`、`.nvmrc`、`.editorconfig`、`.gitattributes`、`.gitignore`、`LICENSE`、`README.md`。
- 建立 `src/`、`content/`、`themes/`、`tests/`、`scripts/`、`docs/`、`public/`。
- 建立 `site.config.ts` 与 `site.config.example.ts`，定义完整的站点身份 schema；先提供最小可用的 `npm run setup`。
- 最小 `build.ts` 输出一个带正确 base 的 `index.html`，并验证 `SITE_URL` / `SITE_BASE` 注入。
- 写入 `ci.yml`、`deploy.yml`、`dependabot.yml`。
- 创建 GitHub 仓库；构建系统仓库只跑 CI，不启用 Pages。
- 写 `docs/customization.md` 骨架，确保新用户知道只改配置和内容。
- **验收**：首次部署成功；项目页子路径下 HTML/CSS 正常；`npm run setup` 能从零生成有效配置；CI 在 Ubuntu 和 Windows 通过。

### Phase 1 — 内容管线与单语站点

- 配置 schema、内容扫描、frontmatter 校验、Markdown 管线。
- Shiki 双主题高亮、标题锚点、TOC、摘要、阅读时长、上下篇。
- 路由：首页分页、文章、标签、标签总览、归档、关于、404。
- 输出 Atom、sitemap、robots、`build-manifest.json`。
- 主题 API v1 + `folio` 主题（亮/暗、TOC、导航、页脚、SEO head）。
- dev server、SSE 刷新、错误覆盖层。
- 单元/集成/快照测试；内部链接与 SEO 校验。
- **验收**：中文站点完整可用；`npm run check` 通过；构建确定性通过。

### Phase 2 — 多语言

- 内容模型加入 `lang`、`translationKey`、`alternates`。
- 中文根路径 + `/en/` 路由；不生成 `/zh/`。
- 主题 i18n、站点覆盖、语言切换器、`hreflang`/`x-default`。
- 每语言独立标签、归档、分页、Atom、sitemap alternate、搜索过滤。
- 双语 fixture 与 SEO 断言。
- **验收**：双语构建；同一文章两个语言版本互相链接；无重复 canonical。

### Phase 3 — 主题系统固化与三套主题

- manifest、`apiVersion`、配置 schema、布局回退、资源复制与哈希。
- 主题加载器与 `defineTheme` API。
- 三套完整主题：
  - `folio`：编辑排版，默认；Phase 1 先具备基础，本阶段补完细节和暗色模式。
  - `orbital`：复古未来主义；等宽元信息、技术网格、磷光强调色、可关闭的扫描线。
  - `scholar`：学术；衬线正文、边注/脚注、编号章节、摘要、参考文献、打印样式。
- 每套主题的 `preview.png` 用真实构建截图，不用概念图。
- 生成 `docs/theme-gallery.md`：三套主题的真实截图、设计定位、适用场景，方便使用者选择。
- `check-theme` 一致性测试与 `docs/theming.md`；按 §4.12 做视觉评审。
- **验收**：修改 `site.config.ts` 的 `theme.name`，或运行 `npm run dev -- --theme=orbital`，即可切换；三套主题均通过全部检查，且 360/768/1280/1440 截图无布局问题。

### Phase 4 — 搜索与数学

- Pagefind 构建后索引、搜索页、核心 `search.js`、双语过滤。
- 子路径部署适配；索引排除代码和公式。
- `remark-math` + `rehype-katex`；`hasMath` 控制 CSS；错误即失败。
- 搜索与公式的集成测试；Playwright 冒烟测试（可选）。
- **验收**：中文/英文搜索互不串；公式页面正确渲染；无多余客户端 JS。

### Phase 5 — 质量与发布

- 外部链接每周检查；Lighthouse CI；可访问性修复。
- OG 默认图、响应式图片（可选）、TOC 滚动高亮。
- 完成 `README`、`authoring`、`theming`、`deployment`、ADR。
- 生产发布与 smoke test；回滚演练。
- **验收**：所有门禁通过；生产 URL 的首页、英文、文章、搜索、公式、404、feed、sitemap 全部正常。

### 全局完成定义（DoD）

- `npm run check` 在 Windows 和 Ubuntu 通过。
- 构建确定性检查通过（Pagefind 索引除外）。
- 内部链接零错误，SEO 校验零错误。
- 三套主题通过一致性测试，第四套主题按文档可在半天内接入。
- 中文根路径与 `/en/` 功能对等。
- 搜索、数学、暗色模式、键盘导航可用。
- GitHub Pages 生产地址 smoke test 通过。
- 文档与 ADR 完整，新成员可按文档从零构建和发布。

## 8. 风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| 主题 API 范围膨胀 | 工期失控、主题难维护 | 冻结 v1，只做布局/配置/资源/i18n；不做插件、hooks、短代码 |
| 三套主题工作量 | 工期拉长、质量不均 | 共用契约和基础样式；每套先定设计方向和时间盒；先完成 `folio`，再做 `orbital`/`scholar` |
| 设计模板化、AI 味 | 三套主题看起来像同一套换色 | 按 §4.12 清单做视觉评审；真实截图；遮住 logo 仍能辨认 |
| 配置项过多 | 新用户改不动 | 单一 `site.config.ts` + `npm run setup` + example；zod 报错带字段路径和示例 |
| 复用与个人需求冲突 | 引擎被个人内容污染 | 站点身份只走配置；内容与主题分离；CI 检查硬编码作者/域名 |
| i18n canonical/hreflang 错误 | SEO 重复内容、语言错配 | 自动 SEO 校验；不生成 `/zh/`；x-default 固定中文根 |
| GitHub Pages 子路径资源 404 | 生产白屏 | Phase 0 就部署项目页；所有 URL 走 helper；构建后用子路径验收 |
| 中文标签 URL 编码问题 | 标签页 404 | NFC 规范化、碰撞检测、百分号编码；Phase 1 在 Pages 上实测 |
| Pagefind 中文召回不佳 | 搜索体验差 | 用真实中文 fixture 测试；保留中文 bigram 索引适配层 |
| 构建时间随文章增长 | CI 变慢 | 单文件 Markdown 缓存、Shiki 单例、并发限制；监控构建耗时 |
| Windows 路径差异 | 本地/CI 行为不一致 | 全程 `node:path`、`pathToFileURL`；CI 加 Windows job |
| CDN 缓存导致更新延迟 | 发布后看到旧页面 | 资源内容哈希；HTML 接受约 10 分钟 TTL；发布后 smoke test 等待 |
| 外部链接检查波动 | CI 误报 | 外链检查独立每周运行，不阻塞 PR |
| Pages 1 GB / 带宽限制 | 图片多时超限 | 图片压缩、响应式尺寸、不上大文件 |
| 仓库改名/迁移 | 项目页 URL 变化 | 尽量先上自定义域名；保留重定向页 |
| 依赖供应链风险 | 构建被污染 | 精简依赖、Dependabot、官方 action、最小权限 |
| 内容原始 HTML XSS | 站点被注入 | 默认禁用原始 HTML；开启时 sanitize |
| 主题执行任意代码 | 本地安全风险 | v1 只接受本地/可信主题；不提供远程安装 |

## 9. 配置项与实例数据

这些信息不再是引擎的硬编码前提，而是 `site.config.ts` 的字段，由 `npm run setup` 或手动填写。引擎本身不需要知道当前作者是谁。

站点实例需要填写：

- `identity.author`：姓名、邮箱、主页、头像（可选）。
- `identity.social`：GitHub、邮箱、RSS 等。
- `identity.repository`（可选）：GitHub owner/name，用于页脚源码链接；部署仍由 `configure-pages` 自动检测。
- `locales.entries.zh`：标题、描述、tagline。
- `locales.entries.en`：独立的标题、描述、tagline，不是中文的逐字翻译。
- `site.url` / `site.customDomain`：生产域名；本地可留 `http://localhost:4000`。
- `theme.name`：`folio` / `orbital` / `scholar`，默认 `folio`。

引擎自动处理：

- GitHub 用户名和仓库名：CI 通过 `actions/configure-pages` 自动获取，不写进配置。
- 项目页 base：由 `configure-pages` 的 `base_path` 注入；本地用 `--base` 模拟。
- 许可证默认：代码 MIT，内容 CC BY-NC-SA 4.0，可在配置中改。
- 中文和英文的标题、描述、导航文案互不覆盖。

其他人复用时：

- 创建博客仓库 → `npm install github:dx3906999/dxbe` → `dxbe setup` → 写 `content/` → 选择主题 → push。
- 不需要改代码、主题模板或 CI 文件。
- 使用自己的域名：在 setup 中填写，或设置 `customDomain`，构建生成 `CNAME`。

仍然可选（v2）：

- 评论（giscus）、隐私友好的访问统计（Umami/Plausible）、图片 CDN。默认不启用。

## 10. 下一步

1. 你确认本计划，或指出要调整的点（尤其是 Phase 0 的仓库名、base、许可证）。
2. 我进入 Phase 0：初始化仓库、工程规范、CI/CD 和 Pages 空站部署。
3. Phase 0 验收通过后，再进入内容管线，避免一次性堆太多代码。
