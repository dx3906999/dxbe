# 架构

## 构建流水线

```
site.config.ts
  → 扫描 content/<lang>/posts 和 pages
  → frontmatter 校验 + Markdown 渲染（缓存）
  → 内容模型：语言、译文、标签、归档、上下篇
  → 路由表：首页/文章/标签/归档/搜索/页面/404
  → 主题布局渲染 → 临时目录
  → Atom / sitemap / robots / manifest / CNAME
  → 原子替换 dist/
  → Pagefind 建索引（独立命令）
```

## 包与博客实例

`dxbe` 是可安装的 npm 包。构建时用 tsup 把 CLI、主题 API、配置 API 和三套内置主题编译到 `dist/`；主题的 `assets/`、`i18n/` 和 `search.js` 复制到对应位置。博客仓库只安装这个包，放 `content/`、`site.config.ts`、`public/` 和部署工作流。

内置主题从包的 `dist/themes/` 解析；博客仓库的 `themes/<name>/` 优先，可用于覆盖或新增主题。博客仓库不需要 `src/`、`themes/`、`scripts/` 或测试。

## 模块边界

- `src/core`：纯内容和路由逻辑，不读环境变量、不打印日志、不写文件（除了 Markdown 缓存）。
- `src/cli`：参数解析、I/O、开发服务器、检查、Pagefind、退出码。`src/cli/index.ts` 是唯一的 bin 入口。
- `src/theme`：主题加载、配置校验、i18n、资源复制、主题 API。
- `scripts`：包构建时复制静态资源。
- `themes/*`：只负责 HTML，不改 URL、不改路由。

`core` 不 import 主题内部文件；外部主题 import `dxbe/theme` 的公共 API。

## 内容模型

- 每个语言独立排序、标签、归档和分页。
- `translationKey` 跨语言关联译文；`alternates` 用于 hreflang 和语言切换。
- 文章 URL `/<lang>/posts/<slug>/`；默认语言不带前缀。
- 页面 URL `/<lang>/<slug>/`；默认语言不带前缀。
- 标签 URL 对中文做百分号编码，输出目录保留 Unicode；链接检查覆盖两者。
- 文章和页面的同目录资源复制到对应输出目录。

## 语言选择

`features.autoLanguage` 开启时，默认语言首页会嵌入主题 API 提供的 `languageBootstrap(ctx)` 脚本：读取 `navigator.languages`，只在默认语言首页跳转到有对应译文的语言首页；使用 `location.replace`，避免历史记录回退陷阱。文章、页面和其他语言首页不重定向。语言切换链接带 `data-language`，点击后把选择写入按站点 base 区分的 localStorage key；已有选择优先于浏览器语言。

## 主题契约

- `theme.json` 声明 `apiVersion`、入口、资源和 i18n 目录。
- `theme.ts` 用 `defineTheme` 导出配置 schema 和布局表。
- 每个布局收到 `ThemeContext`；核心提供 `html` / `raw`、URL helper、日期、资源、i18n 和 SEO 数据。
- 缺失布局按回退链处理，最终使用内置 fallback。
- 主题资源复制到 `dist/assets/<theme>/`，URL 带内容哈希。
- `npm run check:theme` 用固定内容构建每套主题并检查结构。

## 搜索

生产构建后由 `dxbe index` 扫描 `dist`；`dxbe dev` 在每次成功重建后扫描 `.dev-dist/<port>`，因此本地搜索也可用。只有带 `data-pagefind-body` 的文章和页面被索引；正文容器带 `data-pagefind-filter="lang:<lang>"`。代码块和公式通过 `--exclude-selectors` 排除。

核心的 `src/assets/search.js` 懒加载 `pagefind/pagefind.js`，按当前语言传 filter，渲染结果、更新 `?q=` 并处理空/错误状态。加载或查询超过 12 秒会显示错误，不会一直停在“正在搜索”。主题只提供容器和样式。

## 数学

`remark-math` + `rehype-katex` 在构建时渲染 HTML + MathML。`hasMath` 由渲染结果标记；主题只在该页面引入 KaTeX CSS。字体和 CSS 复制到 `dist/assets/vendor/katex/`，不随主题重复。

## 缓存与确定性

- Markdown 结果按源文 + 管线版本 + 数学/高亮配置的 SHA-256 缓存到 `.cache/markdown/`。
- 主题改动不使 Markdown 缓存失效。
- 路由、标签、归档使用显式排序；输出不写构建时间。
- `npm run check:deterministic` 连续构建两次并比较字节；Pagefind 索引不在比较范围。
- 生产构建先写 `.build-tmp`，成功后替换 `dist`；失败不覆盖上一次成功产物。

## 错误与日志

- `BuildError` 带 `code`、`file`、`hint`；CLI 统一格式化并以 1 退出。
- 内容错误、主题配置错误、Markdown 公式错误都会中断构建。
- 缺失主题布局、缺失 i18n key、无文章语言等情况打印 warning。
- `Logger` 分级；`core` 通过注入的 logger 输出。

## 安全

- 原始 HTML 默认关闭；开启时走 `rehype-sanitize`。
- 所有模板插值默认转义；只有 `SafeHtml` 走 `raw`。
- 主题是本地可信代码；v1 不支持远程安装。
- GitHub Actions 使用最小权限，部署只从 `main` 触发。
