---
title: Typography notes for three themes
date: 2026-10-21T09:30:00+08:00
tags: [Typography, Themes]
categories: [Design]
slug: typography-notes
translationKey: typography-notes
summary: folio, orbital, and scholar are not recolors. Their typographic systems decide how they read.
---

A theme is a reading system, not a palette. These three themes share the same content and the same theme contract, but they change the pace of reading.

## folio

Editorial. Warm paper, serif body text, a narrow measure, thin rules. Hierarchy comes from scale and whitespace, not cards or shadows. The dark mode is deep ink with warm off-white text, not an inverted light theme.

## orbital

Retro-futurism. Monospace carries metadata and navigation; narrow sans-serif carries headings. Thin grids, numbered sections, and phosphor amber define the language. Scanlines are optional and respect `prefers-reduced-motion`.

## scholar

Academic. Serif text, numbered sections, an abstract, sidenotes, and references. Print styles are part of the theme, not an afterthought.

## Shared constraints

- Hide the logo and accent color; the layout should still identify the theme.
- Long Chinese, long English, code blocks, math, tables, and posts without images all have to read well.
- No horizontal scrolling at 360px.

A theme that only changes color is not a new theme.
