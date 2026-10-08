'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Dices, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Poster } from '@/components/movie/movie-card'
import { Reveal } from '@/components/ui/reveal'
import { movieHref, runtimeLabel } from '@/lib/utils'
import type { LibraryMovie } from '@/types/domain'
import { pickRandom } from './filters'

export function RandomPicker({ candidates }: { candidates: LibraryMovie[] }) {
  const [selected, setSelected] = useState<LibraryMovie | null>(null)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="random-trigger">
          <Dices size={16} />
          Pick a film
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Let the vault decide.</DialogTitle>
        <DialogDescription>
          {candidates.length
            ? `${candidates.length} eligible ${candidates.length === 1 ? 'film' : 'films'} match your current filters. A little chance, a good evening.`
            : 'No films match your filters. Clear a filter to bring more possibilities into the picture.'}
        </DialogDescription>
        {selected && candidates.some((movie) => movie.id === selected.id) && (
          <Reveal key={selected.id} className="random-reveal">
            <div className="random-poster">
              <div className="poster">
                <Poster movie={selected} />
              </div>
            </div>
            <div className="random-copy">
              <p className="eyebrow">Tonight’s contender</p>
              <h3>{selected.title}</h3>
              <p>
                {selected.year ?? 'Year unknown'} ·{' '}
                {runtimeLabel(selected.runtime)}
              </p>
              <p>
                {[
                  ...new Set(
                    selected.providers?.offers.flatrate.map(
                      (provider) => provider.name,
                    ) ?? [],
                  ),
                ].join(' · ') || 'Streaming availability not listed'}
              </p>
              <Button variant="secondary" asChild>
                <Link href={movieHref(selected)}>
                  View film
                  <ArrowUpRight size={14} />
                </Link>
              </Button>
            </div>
          </Reveal>
        )}
        <div className="form-actions">
          <Button
            disabled={!candidates.length}
            onClick={() => setSelected(pickRandom(candidates))}
          >
            <Dices size={16} />
            {selected ? 'Pick again' : 'Pick a film'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
