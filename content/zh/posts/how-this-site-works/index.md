---
title: 这个站点是怎么搭起来的
date: 2026-10-22T10:00:00+08:00
tags: [工程, 静态站点]
categories: [工程实践]
slug: how-this-site-works
translationKey: how-this-site-works
summary: 记录这个博客的构建方式：Node、Markdown、主题契约和 GitHub Pages。
---

这个站点没有用现成的博客框架。生成器在仓库里，内容在 `content/`，主题在 `themes/`。

## 构建链路

源文件是 Markdown，frontmatter 里放标题、日期、标签和译文 key。构建时依次完成：

1. 扫描 `content/<lang>/`，校验 frontmatter。
2. 用 unified 渲染 Markdown，Shiki 处理代码，KaTeX 处理公式。
3. 按语言和路由生成 HTML。
4. 写出 Atom、sitemap 和搜索索引。

```ts
export async function buildSite(loaded: LoadedConfig): Promise<BuildResult> {
  const content = await scanContent(loaded, { includeDrafts: false, includeFuture: false })
  const tasks = buildTasks(loaded, content)
  return renderTasks(tasks)
}
```

## 公式

行内公式写成 `$E = mc^2$`，块级公式单独成段：

$$
\int_{0}^{1} x^2 \, dx = \frac{1}{3}
$$

## 路由表

| 路径 | 内容 |
| --- | --- |
| `/` | 中文首页 |
| `/posts/<slug>/` | 中文文章 |
| `/en/` | 英文首页 |
| `/tags/<tag>/` | 标签页 |

路径规则一旦发布就不再改。改动 slug 之前先想清楚旧链接怎么办。

## 为什么不用现成框架

需要三件现成框架不容易同时满足的事：中文在根路径、主题可以整体替换、构建逻辑能自己改。自己维护构建链的代价是维护成本，所以关键部分都写了测试和校验脚本。
