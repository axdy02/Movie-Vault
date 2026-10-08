import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function slugify(value: string) {
  return (
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'untitled'
  )
}
export function movieHref(movie: { tmdbId: number; title: string }) {
  return `/movie/${movie.tmdbId}-${slugify(movie.title)}`
}
export function personHref(person: { tmdbId: number; name: string }) {
  return `/people/${person.tmdbId}-${slugify(person.name)}`
}
export function averageRating(ratings: (number | null | undefined)[]) {
  const available = ratings.filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  )
  return available.length
    ? available.reduce((sum, v) => sum + v, 0) / available.length
    : null
}
export function watchedAggregate(states: { watched: boolean }[]) {
  const watched = states.filter((state) => state.watched).length
  return states.length === 2 && watched === 2
    ? 'both'
    : states[0]?.watched
      ? 'userA'
      : states[1]?.watched
        ? 'userB'
        : 'neither'
}
export function formatDate(
  value: string | null,
  options?: Intl.DateTimeFormatOptions,
) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Unknown date'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    ...options,
  }).format(new Date(value))
}
export function runtimeLabel(runtime: number | null) {
  return runtime == null
    ? 'Runtime unknown'
    : `${Math.floor(runtime / 60)}h ${runtime % 60}m`
}
