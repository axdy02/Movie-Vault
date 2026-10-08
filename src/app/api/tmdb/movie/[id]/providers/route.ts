import { tmdbIdSchema, regionSchema } from '@/lib/validation/mutations'
import { getVault } from '@/server/queries/vault.queries'
import { getProviders } from '@/server/queries/provider.queries'
import { apiResponse } from '@/server/http'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiResponse(async () => {
    const id = tmdbIdSchema.parse((await params).id)
    const region = regionSchema.parse(
      new URL(request.url).searchParams.get('region') ?? 'IN',
    )
    const vault = await getVault(region)
    return getProviders(
      id,
      region,
      vault.movies.find((movie) => movie.tmdbId === id),
    )
  })
}
