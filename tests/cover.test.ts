import { describe, expect, it } from 'vitest'
import { resolveCover } from '../src/core/content.ts'

describe('post covers', () => {
  const file = 'content/zh/posts/hello/index.md'

  it('points a file beside the post at its published copy', () => {
    expect(resolveCover('cover.jpg', '/posts/hello/', ['cover.jpg'], true, file)).toBe(
      '/posts/hello/cover.jpg',
    )
    expect(
      resolveCover('./img/封面 1.png', '/en/posts/hello/', ['img/封面 1.png'], true, file),
    ).toBe('/en/posts/hello/img/%E5%B0%81%E9%9D%A2%201.png')
  })

  it('leaves site paths and absolute URLs alone', () => {
    expect(resolveCover('/images/a.webp', '/posts/hello/', [], true, file)).toBe('/images/a.webp')
    expect(resolveCover('https://cdn.example.com/a.jpg', '/posts/hello/', [], false, file)).toBe(
      'https://cdn.example.com/a.jpg',
    )
  })

  it('fails the build when the file is missing or outside the post', () => {
    expect(() => resolveCover('missing.jpg', '/posts/hello/', ['cover.jpg'], true, file)).toThrow(
      /Cover image "missing.jpg" was not found/,
    )
    expect(() => resolveCover('../other/cover.jpg', '/posts/hello/', [], true, file)).toThrow()
    expect(() => resolveCover('cover.jpg', '/posts/hello/', [], false, file)).toThrow()
  })
})
