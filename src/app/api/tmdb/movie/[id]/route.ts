import { tmdbIdSchema } from '@/lib/validation/mutations'
import { AppError } from '@/lib/auth/errors'
import { getMovie } from '@/server/queries/vault.queries'
import { apiResponse } from '@/server/http'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiResponse(async () => {
    const id = tmdbIdSchema.parse((await params).id)
    const result = await getMovie(id)
    if (!result)
      throw new AppError(
        'NOT_FOUND',
        'This movie could not be loaded. Please try again.',
        404,
      )
    return result.movie
  })
}
