import { tmdbIdSchema } from '@/lib/validation/mutations'
import { fetchPersonCredits } from '@/lib/tmdb/client'
import { transformFilmography } from '@/lib/tmdb/transforms'
import { apiResponse } from '@/server/http'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiResponse(
    async () => ({
      filmography: transformFilmography(
        await fetchPersonCredits(tmdbIdSchema.parse((await params).id)),
      ),
    }),
    300,
  )
}
