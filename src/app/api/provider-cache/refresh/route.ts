import { revalidatePath } from 'next/cache'
import { apiResponse, assertSameOrigin, readJsonBody } from '@/server/http'
import { executeMutation } from '@/server/mutations/vault.mutations'

export async function POST(request: Request) {
  return apiResponse(async () => {
    assertSameOrigin(request)
    const body = await readJsonBody(request)
    const result = await executeMutation(
      typeof body === 'object' && body !== null
        ? { ...body, type: 'refresh_providers' }
        : body,
    )
    revalidatePath('/library')
    revalidatePath('/movie/[slug]', 'page')
    revalidatePath('/activity')
    return { ok: true, ...result }
  })
}
