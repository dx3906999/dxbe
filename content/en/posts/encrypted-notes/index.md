---
title: An encrypted post
date: 2026-10-25T12:00:00+08:00
tags: [Engineering]
categories: [Engineering]
slug: encrypted-notes
translationKey: encrypted-notes
summary: A demo of an encrypted post. The password is dxbe-demo.
cover: cover.svg
encrypt: demo
---

Unlocked. This body was encrypted with AES-256-GCM at build time; the page carries only ciphertext and the password is in no output file.

## How to write one

Put `encrypt: diary` in the frontmatter and `diary: your password` in `passwords.yml`. Posts with the same name share a password, and once one is unlocked in a tab the others open on their own.

```yaml
encrypt: diary
```

## What stays public

The title, date, tags, and `summary` remain visible in lists, feeds, and search. Without a `summary` the post shows a fixed "This post is encrypted." instead of an excerpt.
