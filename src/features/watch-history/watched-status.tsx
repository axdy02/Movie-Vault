import { Check, Circle } from 'lucide-react'
import { averageRating, formatDate } from '@/lib/utils'
import type { EditorProfile, PublicUserState } from '@/types/domain'

export function WatchedStatus({
  states,
  editors,
}: {
  states: PublicUserState[]
  editors: EditorProfile[]
}) {
  const average = averageRating(states.map((state) => state.rating))
  const both = states.length === 2 && states.every((state) => state.watched)
  return (
    <>
      <h2>Our screenings</h2>
      {editors.length ? (
        editors.map((editor) => {
          const state = states.find((entry) => entry.userId === editor.id)
          return (
            <div className="state-row" key={editor.id}>
              <span className="avatar">
                {editor.displayName.slice(0, 1).toUpperCase()}
              </span>
              <div className="state-row-copy">
                <strong>{editor.displayName}</strong>
                <p>
                  {state?.lastWatchedAt
                    ? `Last watched ${formatDate(state.lastWatchedAt)} · ${state.watchCount} ${state.watchCount === 1 ? 'watch' : 'watches'}`
                    : 'No screenings recorded'}
                </p>
              </div>
              <span
                className={`state-status ${state?.watched ? 'watched' : ''}`}
              >
                {state?.watched ? <Check size={12} /> : <Circle size={10} />}
                {state?.watched ? 'Watched' : 'Unwatched'}
              </span>
              {state?.rating !== null && state?.rating !== undefined && (
                <span
                  className="state-rating"
                  aria-label={`${editor.displayName} rating ${state.rating} out of 10`}
                >
                  {state.rating.toFixed(1)}
                </span>
              )}
            </div>
          )
        })
      ) : (
        <p className="provider-empty">
          Member watch states will appear when the vault is connected.
        </p>
      )}
      {both && (
        <p className="feedback feedback-success">
          <Check size={14} />
          Both members have watched this film.
        </p>
      )}
      {average !== null && (
        <p className="provider-freshness">
          Average member rating{' '}
          <strong className="text-accent">{average.toFixed(1)} / 10</strong>
        </p>
      )}
    </>
  )
}
