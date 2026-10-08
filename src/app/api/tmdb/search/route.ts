import { z } from 'zod'
import { searchTmdb } from '@/lib/tmdb/client'
import { transformSearch } from '@/lib/tmdb/transforms'
import { apiResponse } from '@/server/http'

const query = z.object({
  q: z.string().trim().min(2).max(120),
  type: z.enum(['multi', 'movie', 'person']).default('multi'),
  page: z.coerce.number().int().min(1).max(500).default(1),
})

export async function GET(request: Request) {
  return apiResponse(async () => {
    const params = query.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    )
    const data = await searchTmdb(params.q, params.type, params.page)
    return {
      ...transformSearch(data.results, params.type),
      page: data.page,
      totalPages: Math.min(data.total_pages, 500),
    }
  }, 300)
}
