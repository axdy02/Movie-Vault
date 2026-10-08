'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, RefreshCw, Tv } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Feedback, PendingIcon } from '@/components/ui/feedback'
import { useMutation } from '@/features/library/use-mutation'
import { DEFAULT_REGION, PROVIDER_TTL_MS } from '@/lib/constants'
import { REGIONS, REGION_STORAGE_KEY } from '@/lib/regions'
import { formatDate } from '@/lib/utils'
import type { OfferType, ProviderData } from '@/types/domain'

const offerSchema = z.object({
  id: z.number(),
  name: z.string(),
  logoPath: z.string().nullable(),
  priority: z.number(),
})
const offers = z.array(offerSchema)
const providerSchema = z.object({
  region: z.string(),
  offers: z.object({
    flatrate: offers,
    free: offers,
    ads: offers,
    rent: offers,
    buy: offers,
  }),
  link: z.string().nullable(),
  fetchedAt: z.string().nullable(),
  error: z.string().optional(),
})
const groups: { type: OfferType; label: string }[] = [
  { type: 'flatrate', label: 'Subscription streaming' },
  { type: 'free', label: 'Free' },
  { type: 'ads', label: 'With ads' },
  { type: 'rent', label: 'Rent' },
  { type: 'buy', label: 'Buy' },
]

export function ProviderList({
  tmdbId,
  movieId,
  initial,
  canRefresh,
  useStoredPreference = true,
}: {
  tmdbId: number
  movieId?: string
  initial: ProviderData
  canRefresh: boolean
  useStoredPreference?: boolean
}) {
  const [region, setRegion] = useState(initial.region || DEFAULT_REGION)
  const [snapshot, setSnapshot] = useState(initial)
  const [loadingRegion, setLoadingRegion] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<{
    region: string
    message: string
  } | null>(null)
  const [version, setVersion] = useState(0)
  const [now] = useState(() => Date.now())
  const pathname = usePathname()
  const mutation = useMutation()

  useEffect(() => {
    if (!useStoredPreference) return
    const timer = setTimeout(() => {
      try {
        const preference = localStorage.getItem(REGION_STORAGE_KEY)
        if (
          preference &&
          REGIONS.some((entry) => entry.code === preference) &&
          preference !== initial.region
        )
          setRegion(preference)
      } catch {
        /* Storage is optional for a viewing preference. */
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [initial.region, useStoredPreference])

  useEffect(() => {
    if (region === initial.region && version === 0) return
    const controller = new AbortController()
    async function load() {
      setLoadingRegion(region)
      setRequestError(null)
      try {
        const response = await fetch(
          `/api/tmdb/movie/${tmdbId}/providers?region=${region}`,
          { signal: controller.signal },
        )
        if (!response.ok) throw new Error('Provider lookup failed')
        const data = providerSchema.parse(await response.json())
        if (!controller.signal.aborted) setSnapshot(data)
      } catch {
        if (!controller.signal.aborted)
          setRequestError({
            region,
            message: `Availability for ${REGIONS.find((entry) => entry.code === region)?.name ?? region} could not be loaded. Try again.`,
          })
      } finally {
        if (!controller.signal.aborted) setLoadingRegion(null)
      }
    }
    void load()
    return () => controller.abort()
  }, [region, tmdbId, initial.region, version])

  const initialIsNewer =
    (Date.parse(initial.fetchedAt ?? '') || 0) >
    (Date.parse(snapshot.fetchedAt ?? '') || 0)
  // The server snapshot remains useful after a region round trip or a revalidation.
  const current =
    region === initial.region && (snapshot.region !== region || initialIsNewer)
      ? initial
      : snapshot.region === region
        ? snapshot
        : null
  const loading = loadingRegion === region
  const error =
    requestError?.region === region
      ? requestError.message
      : (current?.error ?? null)
  const hasOffers =
    current && Object.values(current.offers).some((group) => group.length)
  const stale =
    current?.fetchedAt && now - Date.parse(current.fetchedAt) >= PROVIDER_TTL_MS
  const regionName =
    REGIONS.find((entry) => entry.code === region)?.name ?? region
  return (
    <section className="detail-panel">
      <div className="provider-header">
        <h2>Where to watch</h2>
        <select
          aria-label="Streaming region"
          className="control-select"
          value={region}
          onChange={(event) => {
            setRegion(event.target.value)
            try {
              localStorage.setItem(REGION_STORAGE_KEY, event.target.value)
            } catch {
              /* Storage is optional. */
            }
          }}
        >
          {REGIONS.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.name}
            </option>
          ))}
        </select>
      </div>
      {loading && (
        <p className="provider-empty" role="status">
          <PendingIcon pending /> Checking listings for {regionName}…
        </p>
      )}
      {error && <Feedback message={error} error />}
      {!loading && !hasOffers && (
        <p className="provider-empty">
          Streaming availability is not currently listed for {regionName}.
          Listings may be incomplete.
        </p>
      )}
      {current &&
        groups
          .filter((group) => current.offers[group.type].length > 0)
          .map((group) => (
            <div className="provider-group" key={group.type}>
              <h3>{group.label}</h3>
              <div className="provider-items">
                {current.offers[group.type].map((provider) => (
                  <div key={provider.id} className="provider-item">
                    <span className="provider-logo">
                      {provider.logoPath ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${provider.logoPath}`}
                          fill
                          alt={`${provider.name} logo`}
                          sizes="35px"
                        />
                      ) : (
                        <Tv size={17} />
                      )}
                    </span>
                    <span>{provider.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
      {current?.fetchedAt && (
        <p className="provider-freshness">
          {stale ? 'Cached listings · ' : ''}Last checked{' '}
          {formatDate(current.fetchedAt)}
          {stale ? '. Availability may have changed.' : '.'}
        </p>
      )}
      <div className="detail-actions">
        {current?.link && (
          <Button asChild variant="outline" size="sm">
            <a href={current.link} target="_blank" rel="noreferrer">
              Check listings
              <ArrowUpRight size={12} />
            </a>
          </Button>
        )}
        {canRefresh && movieId ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={mutation.pending || loading}
            onClick={() =>
              mutation.run(
                {
                  type: 'refresh_providers',
                  movieId,
                  tmdbId,
                  region,
                  context: {
                    surface: 'movie_detail',
                    route: pathname,
                    method: 'button',
                  },
                },
                () => setVersion((value) => value + 1),
              )
            }
          >
            <PendingIcon pending={mutation.pending} />
            {!mutation.pending && <RefreshCw size={12} />}Refresh
          </Button>
        ) : (
          error && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setVersion((value) => value + 1)}
            >
              Retry
            </Button>
          )
        )}
      </div>
      <Feedback
        message={mutation.result?.message ?? null}
        error={mutation.result?.ok === false}
      />
      <p className="provider-attribution">
        Availability data by{' '}
        <a href="https://www.justwatch.com/" target="_blank" rel="noreferrer">
          JustWatch
        </a>{' '}
        via{' '}
        <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
          TMDB
        </a>
        . Confirm availability with the service.
      </p>
    </section>
  )
}
