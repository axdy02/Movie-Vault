export function safeReturnPath(value: unknown, fallback = '/library'): string {
  if (
    typeof value !== 'string' ||
    value.length > 250 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u001f]/.test(value)
  )
    return fallback
  try {
    const base = 'https://movie-vault.invalid'
    const target = new URL(value, base)
    return target.origin === base
      ? `${target.pathname}${target.search}${target.hash}`
      : fallback
  } catch {
    return fallback
  }
}
