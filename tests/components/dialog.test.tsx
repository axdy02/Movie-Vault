// @vitest-environment jsdom
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
afterEach(cleanup)
it('traps keyboard focus, closes on Escape and restores focus to its trigger', async () => {
  const user = userEvent.setup()
  render(
    <Dialog>
      <DialogTrigger>Choose a movie</DialogTrigger>
      <DialogContent>
        <DialogTitle>Movie night</DialogTitle>
        <DialogDescription>Choose from the eligible library.</DialogDescription>
        <button>Pick again</button>
      </DialogContent>
    </Dialog>,
  )
  const trigger = screen.getByRole('button', { name: 'Choose a movie' })
  await user.click(trigger)
  const dialog = screen.getByRole('dialog', { name: 'Movie night' })
  await waitFor(() =>
    expect(dialog.contains(document.activeElement)).toBe(true),
  )
  for (let i = 0; i < 5; i++) {
    await user.tab()
    expect(dialog.contains(document.activeElement)).toBe(true)
  }
  await user.keyboard('{Escape}')
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
  expect(trigger).toHaveFocus()
})
