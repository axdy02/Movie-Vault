type ImageSize =
  'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original'

export function tmdbImage(
  path: string | null | undefined,
  size: ImageSize = 'w500',
): string | null {
  if (!path || !/^\/[a-zA-Z0-9._/-]+$/.test(path)) return null
  return `https://image.tmdb.org/t/p/${size}${path}`
}
