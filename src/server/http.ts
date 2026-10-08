import 'server-only'
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AppError, publicError } from '@/lib/auth/errors'

export async function apiResponse(
  operation: () => Promise<unknown>,
  cacheSeconds = 0,
) {
  try {
    const data = await operation()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': cacheSeconds
          ? `public, max-age=${cacheSeconds}`
          : 'private, no-store',
      },
    })
  } catch (error) {
    const safe =
      error instanceof ZodError
        ? {
            code: 'INVALID_INPUT',
            message: 'Check the request parameters and try again.',
            status: 400,
          }
        : publicError(error)
    return NextResponse.json(
      { error: safe.message, code: safe.code },
      { status: safe.status, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin)
    throw new AppError(
      'INVALID_ORIGIN',
      'This request must come from Movie Vault.',
      403,
    )
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text()
  if (text.length > 8000)
    throw new AppError('INVALID_INPUT', 'The request is too large.', 413)
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new AppError('INVALID_INPUT', 'The request could not be read.', 400)
  }
}
