'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { VaultData } from '@/types/domain'
import type { LibraryFilters } from './filters'
import { REGIONS, REGION_STORAGE_KEY } from '@/lib/regions'

const regions = REGIONS.map((region) => ({
  value: region.code,
  label: region.name,
}))
export function FilterDialog({
  vault,
  filters,
  onApply,
  activeCount,
}: {
  vault: VaultData
  filters: LibraryFilters
  onApply: (params: URLSearchParams) => void
  activeCount: number
}) {
  const [open, setOpen] = useState(false)
  const actors = vault.people.filter((person) =>
    person.movieIds.some((id) =>
      vault.movies
        .find((movie) => movie.id === id)
        ?.credits.some(
          (credit) => credit.tmdbId === person.tmdbId && credit.type === 'cast',
        ),
    ),
  )
  const directors = vault.people.filter(
    (person) => person.directedMovieIds.length > 0,
  )
  const genres = [
    ...new Map(
      vault.movies
        .flatMap((movie) => movie.genres)
        .map((genre) => [genre.id, genre]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name))
  const languages = [
    ...new Set(
      vault.movies
        .map((movie) => movie.language)
        .filter((language): language is string => Boolean(language)),
    ),
  ].sort()
  const decades = [
    ...new Set(
      vault.movies
        .map((movie) =>
          movie.year === null ? null : Math.floor(movie.year / 10) * 10,
        )
        .filter((decade): decade is number => decade !== null),
    ),
  ].sort((a, b) => b - a)
  const providers = [
    ...new Map(
      vault.movies
        .flatMap((movie) => Object.values(movie.providers?.offers ?? {}).flat())
        .map((provider) => [provider.id, provider]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name))
  const selectedProviders =
    filters.providers ?? (filters.provider ? [filters.provider] : [])
  const select = (
    name: string,
    label: string,
    options: { value: string; label: string }[],
    value?: string | number,
  ) => (
    <div className="field">
      <label htmlFor={`filter-${name}`}>{label}</label>
      <select id={`filter-${name}`} name={name} defaultValue={value ?? ''}>
        <option value="">Any {label.toLocaleLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
  const range = (
    name: keyof LibraryFilters,
    label: string,
    max?: number,
    step = 1,
  ) => (
    <div className="field">
      <label htmlFor={`filter-${name}`}>{label}</label>
      <input
        id={`filter-${name}`}
        type="number"
        name={name}
        defaultValue={
          typeof filters[name] === 'number' ? (filters[name] as number) : ''
        }
        min={0}
        max={max}
        step={step}
        placeholder="Any"
      />
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <SlidersHorizontal size={15} />
          Filters
          {activeCount > 0 && (
            <span className="filter-count">{activeCount}</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="filter-sheet dialog-wide">
        <DialogTitle>Find your kind of film.</DialogTitle>
        <DialogDescription>
          Combine filters to narrow your vault. All selected conditions apply
          together.
        </DialogDescription>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            const params = new URLSearchParams()
            for (const [key, value] of data.entries())
              if (typeof value === 'string' && value) params.set(key, value)
            const offers = data.getAll('providerChoice').map(String)
            params.delete('providerChoice')
            if (offers.length) params.set('providers', offers.join(','))
            const region = params.get('region')
            if (region) {
              try {
                localStorage.setItem(REGION_STORAGE_KEY, region)
              } catch {
                /* Viewing preference may be unavailable in private browsing. */
              }
            }
            onApply(params)
            setOpen(false)
          }}
        >
          <div className="filter-grid">
            {select(
              'actor',
              'Actor',
              actors.map((person) => ({
                value: String(person.tmdbId),
                label: person.name,
              })),
              filters.actor,
            )}
            {select(
              'director',
              'Director',
              directors.map((person) => ({
                value: String(person.tmdbId),
                label: person.name,
              })),
              filters.director,
            )}
            {select(
              'genre',
              'Genre',
              genres.map((genre) => ({
                value: String(genre.id),
                label: genre.name,
              })),
              filters.genre,
            )}
            {select(
              'status',
              'Watch status',
              [
                { value: 'neither', label: 'Unwatched by both' },
                { value: 'both', label: 'Watched by both' },
                { value: 'one', label: 'Watched by one' },
                ...(vault.editors[0]
                  ? [
                      {
                        value: 'userA',
                        label: `Only ${vault.editors[0].displayName} watched`,
                      },
                    ]
                  : []),
                ...(vault.editors[1]
                  ? [
                      {
                        value: 'userB',
                        label: `Only ${vault.editors[1].displayName} watched`,
                      },
                    ]
                  : []),
                { value: 'watched', label: 'Watched' },
                { value: 'unwatched', label: 'Unwatched' },
              ],
              filters.status,
            )}
            {select(
              'watchedBy',
              'Watched by',
              vault.editors.map((editor) => ({
                value: editor.id,
                label: editor.displayName,
              })),
              filters.watchedBy,
            )}
            {select(
              'addedBy',
              'Added by',
              vault.editors.map((editor) => ({
                value: editor.id,
                label: editor.displayName,
              })),
              filters.addedBy,
            )}
            {select(
              'collection',
              'Collection',
              vault.collections.map((collection) => ({
                value: collection.id,
                label: collection.name,
              })),
              filters.collection,
            )}
            {select(
              'language',
              'Language',
              languages.map((language) => ({
                value: language,
                label:
                  new Intl.DisplayNames('en', { type: 'language' }).of(
                    language,
                  ) ?? language,
              })),
              filters.language,
            )}
            {select(
              'decade',
              'Decade',
              decades.map((decade) => ({
                value: String(decade),
                label: `${decade}s`,
              })),
              filters.decade,
            )}
            {select(
              'region',
              'Provider region',
              regions,
              filters.region ?? 'IN',
            )}
            {range('yearMin', 'Released from', 2100)}
            {range('yearMax', 'Released through', 2100)}
            {range('runtimeMin', 'Minimum minutes', 1000)}
            {range('runtimeMax', 'Maximum minutes', 1000)}
            {range('ratingMin', 'TMDB rating from', 10, 0.5)}
            {range('ratingMax', 'TMDB rating through', 10, 0.5)}
            {range('personalMin', 'Member rating from', 10, 0.5)}
            {range('personalMax', 'Member rating through', 10, 0.5)}
          </div>
          {providers.length > 0 && (
            <fieldset style={{ marginTop: 20, border: 0, padding: 0 }}>
              <legend className="field-label">
                Available on any selected provider
              </legend>
              <div className="filter-grid">
                {providers.map((provider) => (
                  <label
                    key={provider.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      minHeight: 36,
                    }}
                  >
                    <input
                      type="checkbox"
                      name="providerChoice"
                      value={provider.id}
                      defaultChecked={selectedProviders.includes(provider.id)}
                    />
                    {provider.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <p className="field-hint" style={{ marginTop: 18 }}>
            Availability filters use regional snapshots. Films without a
            matching snapshot may be absent from results.
          </p>
          <div className="form-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onApply(new URLSearchParams())
                setOpen(false)
              }}
            >
              Clear filters
            </Button>
            <Button type="submit">Apply filters</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
