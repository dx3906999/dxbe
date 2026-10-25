---
title: How this site is built
date: 2026-10-22T10:00:00+08:00
tags: [Engineering, Static Sites]
categories: [Engineering]
slug: how-this-site-works
translationKey: how-this-site-works
summary: "The build path behind this blog: Node, Markdown, a theme contract, and GitHub Pages."
cover: cover.svg
---

This site does not use an off-the-shelf blog framework. The generator lives in the repository, content lives in `content/`, and themes live in `themes/`.

## Build path

Posts are Markdown with YAML frontmatter. A build does five things:

1. Scan `content/<lang>/` and validate frontmatter.
2. Render Markdown with unified, highlight code with Shiki, and render math with KaTeX.
3. Generate HTML for every language and route.
4. Write Atom, sitemap, and the search index.

```ts
export async function buildSite(loaded: LoadedConfig): Promise<BuildResult> {
  const content = await scanContent(loaded, { includeDrafts: false, includeFuture: false })
  const tasks = buildTasks(loaded, content)
  return renderTasks(tasks)
}
```

## Math

Inline math uses `$E = mc^2$`; display math gets its own block:

$$
\int_{0}^{1} x^2 \, dx = \frac{1}{3}
$$

## Routes

| Path | Content |
| --- | --- |
| `/` | Chinese home |
| `/posts/<slug>/` | Chinese post |
| `/en/` | English home |
| `/tags/<tag>/` | Tag archive |

Route rules are fixed after publishing. Changing a slug means dealing with the old links first.

## Why not an existing framework

Three requirements were hard to satisfy together: Chinese at the site root, themes that can be replaced as a unit, and build logic we can change. The trade-off is maintenance, so the important paths have tests and checks.
