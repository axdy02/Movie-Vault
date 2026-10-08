import { tmdbIdSchema } from '@/lib/validation/mutations'
import { fetchPerson } from '@/lib/tmdb/client'
import { transformPerson } from '@/lib/tmdb/transforms'
import { apiResponse } from '@/server/http'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiResponse(
    async () =>
      transformPerson(await fetchPerson(tmdbIdSchema.parse((await params).id))),
    300,
  )
}
