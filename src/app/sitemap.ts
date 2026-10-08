import type { MetadataRoute } from 'next'
import { getVault } from '@/server/queries/vault.queries'
import { movieHref, personHref } from '@/lib/utils'
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const vault = await getVault()
  const pages = [
    '/',
    '/library',
    '/actors',
    '/directors',
    '/genres',
    '/collections',
    '/about',
    ...vault.movies.map(movieHref),
    ...vault.people.map(personHref),
    ...vault.collections.map((collection) => `/collections/${collection.slug}`),
  ]
  return pages.map((path) => ({
    url: `${site}${path}`,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }))
}
