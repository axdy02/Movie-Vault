// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PreviewGrid } from '@/components/layout/preview-grid'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('homepage preview rows', () => {
  it('fills two rows on wide screens and reduces the same preview on phones', () => {
    let resize: () => void = () => {}
    let columns = 11
    const disconnect = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize = callback
        }
        observe() {}
        disconnect = disconnect
      },
    )
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(2000)
    vi.stubGlobal('getComputedStyle', () => ({
      gridTemplateColumns: Array.from({ length: columns }, () => '200px').join(
        ' ',
      ),
    }))
    const { unmount } = render(
      <PreviewGrid className="poster-grid">
        {Array.from({ length: 31 }, (_, index) => (
          <article key={index}>Film {index + 1}</article>
        ))}
      </PreviewGrid>,
    )
    expect(screen.getAllByRole('article')).toHaveLength(22)
    expect(screen.getByText('Film 22')).toBeVisible()
    columns = 2
    act(() => resize())
    expect(screen.getAllByRole('article')).toHaveLength(4)
    columns = 8
    act(() => resize())
    expect(screen.getAllByRole('article')).toHaveLength(16)
    unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('shows only available cards without duplicating a small collection', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(2000)
    vi.stubGlobal('getComputedStyle', () => ({
      gridTemplateColumns: '200px 200px 200px 200px 200px 200px',
    }))
    render(
      <PreviewGrid className="people-grid">
        <article>A performer</article>
        <article>Another performer</article>
      </PreviewGrid>,
    )
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })
})
