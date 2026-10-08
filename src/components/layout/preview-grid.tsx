'use client'

import { Children, useEffect, useRef, useState, type ReactNode } from 'react'

export function PreviewGrid({
  children,
  className,
  initialCount = 12,
  rows = 2,
}: {
  children: ReactNode
  className: string
  initialCount?: number
  rows?: number
}) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [capacity, setCapacity] = useState(initialCount)

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    function resize() {
      if (!grid || !grid.clientWidth) return
      const tracks = getComputedStyle(grid).gridTemplateColumns
      if (!tracks || tracks === 'none') return
      setCapacity(tracks.trim().split(/\s+/).length * rows)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(grid)
    return () => observer.disconnect()
  }, [rows])

  return (
    <div ref={gridRef} className={`${className} preview-grid`}>
      {Children.toArray(children).slice(0, capacity)}
    </div>
  )
}
