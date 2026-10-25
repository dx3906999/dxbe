import { z } from 'zod'
import { defineTheme } from '../../src/theme/api.ts'
import { archive } from './layouts/archive.ts'
import { categories } from './layouts/categories.ts'
import { category } from './layouts/category.ts'
import { home } from './layouts/home.ts'
import { index } from './layouts/index.ts'
import { notFound } from './layouts/notFound.ts'
import { page } from './layouts/page.ts'
import { post } from './layouts/post.ts'
import { publications } from './layouts/publications.ts'
import { search } from './layouts/search.ts'
import { tag } from './layouts/tag.ts'
import { tags } from './layouts/tags.ts'

export default defineTheme({
  config: z.object({
    accent: z.string().default('#8a2f2f'),
    showToc: z.boolean().default(true),
    showReadingTime: z.boolean().default(true),
    width: z.enum(['narrow', 'wide']).default('narrow'),
  }),
  layouts: {
    index,
    home,
    post,
    page,
    publications,
    archive,
    tag,
    tags,
    category,
    categories,
    search,
    notFound,
  },
})
