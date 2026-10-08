'use client'

import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants'
import type { SearchData, VaultData } from '@/types/domain'

const creditSchema = z.object({
  tmdbId: z.number(),
  name: z.string(),
  profilePath: z.string().nullable(),
  type: z.enum(['cast', 'crew']),
  character: z.string().nullable(),
  job: z.string().nullable(),
  department: z.string().nullable(),
  order: z.number().nullable(),
})
const movieSchema = z.object({
  tmdbId: z.number(),
  title: z.string(),
  originalTitle: z.string().nullable(),
  overview: z.string().nullable(),
  releaseDate: z.string().nullable(),
  year: z.number().nullable(),
  runtime: z.number().nullable(),
  language: z.string().nullable(),
  posterPath: z.string().nullable(),
  backdropPath: z.string().nullable(),
  tmdbRating: z.number().nullable(),
  voteCount: z.number().nullable(),
  popularity: z.number(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })),
  credits: z.array(creditSchema),
  countries: z.array(z.string()),
})
const personSchema = z.object({
  tmdbId: z.number(),
  name: z.string(),
  profilePath: z.string().nullable(),
  department: z.string().nullable(),
  biography: z.string().nullable(),
  knownFor: z.array(z.string()),
})
const searchSchema = z.object({
  movies: z.array(movieSchema),
  people: z.array(personSchema),
  page: z.number(),
  totalPages: z.number(),
})
const recentSearches = new Map<string, { data: SearchData; expires: number }>()

export function useDiscoverySearch(query: string, vault: VaultData, page = 1) {
  const normalized = query.trim().toLocaleLowerCase()
  const [remote, setRemote] = useState<{
    key: string
    data: SearchData
  } | null>(null)
  const [requestError, setRequestError] = useState<{
    key: string
    message: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [retry, setRetry] = useState(0)
  const key = `${normalized}:${page}`
  const saved = useMemo(
    () =>
      !normalized
        ? []
        : vault.movies.filter((movie) => {
            const collectionNames = vault.collections
              .filter((collection) =>
                movie.collectionIds.includes(collection.id),
              )
              .map((collection) => collection.name)
            return [
              movie.title,
              movie.originalTitle ?? '',
              ...movie.credits.map((credit) => credit.name),
              ...collectionNames,
            ]
              .join(' ')
              .toLocaleLowerCase()
              .includes(normalized)
          }),
    [normalized, vault],
  )
  const localPeople = useMemo(
    () =>
      !normalized
        ? []
        : vault.people.filter((person) =>
            person.name.toLocaleLowerCase().includes(normalized),
          ),
    [normalized, vault.people],
  )

  useEffect(() => {
    const controller = new AbortController()
    if (normalized.length < 2) return
    const cached = recentSearches.get(key)
    const timer = setTimeout(async () => {
      setRequestError(null)
      if (cached && cached.expires > Date.now() && retry === 0) {
        setRemote({ key, data: cached.data })
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const response = await fetch(
          `/api/tmdb/search?q=${encodeURIComponent(normalized)}&page=${page}`,
          { signal: controller.signal },
        )
        if (!response.ok)
          throw new Error(
            'Search is temporarily unavailable. Please try again.',
          )
        const data = searchSchema.parse(await response.json())
        if (controller.signal.aborted) return
        if (recentSearches.size >= 25)
          recentSearches.delete(recentSearches.keys().next().value ?? '')
        recentSearches.set(key, { data, expires: Date.now() + 5 * 60 * 1000 })
        setRemote({ key, data })
      } catch {
        if (!controller.signal.aborted)
          setRequestError({
            key,
            message:
              'Global search is temporarily unavailable. Your saved matches are still here.',
          })
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [normalized, key, page, retry])

  const remoteData = remote?.key === key ? remote.data : null
  const error = requestError?.key === key ? requestError.message : null
  const people = [
    ...localPeople,
    ...(remoteData?.people ?? []).filter(
      (person) => !localPeople.some((local) => local.tmdbId === person.tmdbId),
    ),
  ]
  const savedIds = new Set(vault.movies.map((movie) => movie.tmdbId))
  const movies = (remoteData?.movies ?? []).filter(
    (movie) => !savedIds.has(movie.tmdbId),
  )
  return {
    saved,
    people,
    movies,
    loading: normalized.length >= 2 && (loading || (!remoteData && !error)),
    error: normalized.length >= 2 ? error : null,
    totalPages: remoteData?.totalPages ?? 1,
    retry: () => setRetry((value) => value + 1),
  }
}
