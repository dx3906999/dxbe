---
title: 加密文章示例
date: 2026-10-25T12:00:00+08:00
tags: [工程]
categories: [工程实践]
slug: encrypted-notes
translationKey: encrypted-notes
summary: 演示用的加密文章，密码是 dxbe-demo。
encrypt: demo
---

解锁成功。这段正文在构建时用 AES-256-GCM 加密，页面里只有密文，密码不会出现在任何输出文件里。

## 怎么写

在 frontmatter 里写 `encrypt: diary`，再在 `passwords.yml` 里写 `diary: 你的密码`。同名的文章共用一个密码，在同一个标签页里解锁一次后，其他同名文章会自动打开。

```yaml
encrypt: diary
```

## 哪些内容不加密

标题、日期、标签和 `summary` 仍然公开，会出现在列表、feed 和搜索里。不写 `summary` 时用固定的"这篇文章已加密"，不会从正文截取摘要。
