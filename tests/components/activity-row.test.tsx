// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ActivityRow } from '@/components/activity/activity-row'
import { activity } from '../fixtures/domain'

afterEach(cleanup)
describe('activity display', () => {
  it('shows public readable history and India time without private payloads or editor details', () => {
    render(
      <ol>
        <ActivityRow
          event={activity({
            action: 'note.updated',
            after: { note: 'private note text', token: 'secret token' },
          })}
        />
      </ol>,
    )
    expect(
      screen.getByText(/updated a private note for Inception/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/private note text/)).not.toBeInTheDocument()
    expect(screen.queryByText(/secret token/)).not.toBeInTheDocument()
    expect(screen.queryByText('Change details')).not.toBeInTheDocument()
    expect(screen.getByText(/8 Oct 2026/)).toBeInTheDocument()
  })

  it('formats editor rating details while excluding all arbitrary JSON fields', () => {
    render(
      <ol>
        <ActivityRow
          event={activity({
            action: 'rating.changed',
            before: { rating: 8.5, note: 'private text' },
            after: { rating: 9, secret: 'unwanted field' },
          })}
          detailed
        />
      </ol>,
    )
    expect(
      screen.getByText('Editor A changed a rating for Inception from 8.5 to 9'),
    ).toBeInTheDocument()
    expect(screen.getByText('Rating: 8.5 → 9')).toBeInTheDocument()
    expect(screen.queryByText('private text')).not.toBeInTheDocument()
    expect(screen.queryByText('unwanted field')).not.toBeInTheDocument()
  })
})
