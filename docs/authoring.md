# 写作

## 目录

文章按语言分目录，每篇文章一个文件夹：

```
content/
  zh/
    posts/how-this-site-works/
      index.md
      cover.jpg
    pages/about.md
  en/
    posts/how-this-site-works/
      index.md
    pages/about.md
```

`index.md` 是文章正文，同目录的图片会被复制到文章输出目录。Markdown 里直接写 `![alt](./cover.jpg)` 即可。

页面也可以写成目录形式（`pages/about/index.md`），同样会复制同目录文件。

## PDF

PDF 和图片一样放在文章目录里：

```
content/zh/posts/my-paper/
  index.md
  paper.pdf
```

单独一行用图片语法引用，就会嵌入阅读器，下方附标题链接：

```markdown
![论文全文](paper.pdf)
![第 3 页的图](paper.pdf#page=3 "图 2：实验装置")
```

- 标题取引号里的 title，没有就用 alt，再没有就用文件名。
- `#page=3` 这类片段会原样传给浏览器的 PDF 阅读器。
- 多数手机浏览器不能内嵌 PDF，会显示链接；标题链接在任何浏览器里都能打开或下载文件。打印时嵌入框隐藏。
- 写在句子中间（`见 ![论文](paper.pdf)。`）时只生成普通链接，不嵌入。
- 放在 `public/` 里的 PDF 用站点路径引用（`![简历](/files/cv.pdf)`），项目页部署时会自动加 `base`。
- `dxbe check:links` 会检查嵌入的 PDF 是否存在。GitHub Pages 单个文件上限 100 MB，大文件更适合放 Release 附件再写外链。

## Frontmatter

```yaml
---
title: 标题
date: 2026-10-22T10:00:00+08:00
updated: 2026-10-23T09:00:00+08:00
tags: [工程, 静态站点]
categories: [工程实践]
slug: how-this-site-works
translationKey: how-this-site-works
summary: 可选的摘要
draft: false
---
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 文章标题 |
| `date` | 是 | ISO 8601，必须带时区偏移 |
| `updated` | 否 | 更新时间，格式同上 |
| `tags` | 否 | 字符串数组 |
| `categories` | 否 | 字符串数组，平铺分类，生成 `/categories/<slug>/` |
| `slug` | 否 | 默认取目录名；小写 ASCII、数字、连字符 |
| `translationKey` | 否 | 译文关联键，默认等于 slug |
| `summary` | 否 | 摘要；缺省从正文第一段提取 |
| `draft` | 否 | `true` 时只在开发模式出现 |

页面（`pages/`）的 frontmatter 用 `description` 代替 `summary`，`date` 可选。

### 首页简介和发表页

`home.layout: 'profile'` 时，`pages/home.md`（或 `home.page` 指定的页面）作为语言首页渲染，适合放简历或自我介绍。

`features.publications: true` 时，`pages/publications.md` 发布在 `/publications/`。条目写在 frontmatter，正文显示在列表上方：

```yaml
---
title: 发表
publications:
  - title: 论文标题
    authors: [作者 A, 作者 B]   # 也可以写成单个字符串
    venue: 会议或期刊
    year: 2026
    type: 会议论文            # 可选
    note: 可选备注
    links:
      - label: PDF
        url: https://example.com/paper.pdf
---
```

作者列表里与 `identity.author.name` 同名的条目由主题加粗。

链接可以指向站内 PDF：把页面写成 `pages/publications/index.md`，PDF 放在同目录，`url: paper.pdf`；或放进 `public/papers/`，`url: /papers/paper.pdf`（会自动加 `base`）。

## 规则

- `date` 不带时区会直接构建失败。不要写 `2026-10-22`，写 `2026-10-22T10:00:00+08:00`。
- 文章和页面的 slug 只用 `a-z0-9-`；中文标题请显式给 slug。
- 同一语言内 slug 和 `translationKey` 都不能重复。
- 标签可以是中文，URL 会被百分号编码；改名会改变标签页 URL。
- 没有译文的文章只出现在自己语言的首页、归档、feed 和搜索里。
- 草稿在生产构建中排除；未来日期的文章默认也排除，`npx dxbe build --future` 可以包含。
- 原始 HTML 默认关闭。需要时在 `site.config.ts` 加 `markdown: { allowHtml: true }`，构建会走 sanitize。
- 所有内部链接用站点路径；项目页部署时构建会加 `base`。不要手写完整 `https://` 链接指向站内页面。

## 新建文章

```bash
npx dxbe new "这个站点是怎么搭起来的" --slug how-this-site-works --lang zh --tags 工程,静态站点
```

命令会创建：

```
content/zh/posts/how-this-site-works/index.md
```

`--draft` 创建草稿，`--date` 覆盖日期，`--translation-key` 覆盖译文键。创建英文译文时用相同的 slug 和 `translationKey`，目录换成 `en`。

## 标题、代码和公式

- 标题按 `##`、`###` 使用，构建时自动生成锚点和目录。
- 代码块用围栏语法，构建时用 Shiki 高亮；代码和公式不会进入搜索索引。
- 行内公式：`$E = mc^2$`
- 块级公式：

```markdown
$$
\int_{0}^{1} x^2 \, dx = \frac{1}{3}
$$
```

- 表格、任务列表、脚注由 GFM 处理。
- 需要原始 HTML 时优先写成 Markdown；非必要不要打开 raw HTML。

## 示例内容

`content/` 里的文章和页面是示例。替换成自己的内容时，可以直接删除 `content/zh/posts/`、`content/en/posts/` 下的示例目录，保留 `pages/about.md` 或改写它。

`content/README.md` 有同样的说明。
