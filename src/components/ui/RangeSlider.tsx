'use client'

import { useCallback, useRef, useEffect, useState } from 'react'

interface RangeSliderProps {
  min: number
  max: number
  start: number
  end: number
  onChange: (start: number, end: number) => void
  formatLabel?: (value: number, total: number) => string
  className?: string
}

export function RangeSlider({
  min,
  max,
  start,
  end,
  onChange,
  formatLabel,
  className = ''
}: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null)

  const getPositionFromValue = (value: number) => {
    return ((value - min) / (max - min)) * 100
  }

  const getValueFromPosition = useCallback((clientX: number) => {
    if (!trackRef.current) return min
    const rect = trackRef.current.getBoundingClientRect()
    const position = (clientX - rect.left) / rect.width
    const value = Math.round(min + position * (max - min))
    return Math.max(min, Math.min(max, value))
  }, [min, max])

  const handleMouseDown = (thumb: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(thumb)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return
    const value = getValueFromPosition(e.clientX)

    if (dragging === 'start') {
      onChange(Math.min(value, end - 1), end)
    } else {
      onChange(start, Math.max(value, start + 1))
    }
  }, [dragging, start, end, onChange, getValueFromPosition])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  const startPercent = getPositionFromValue(start)
  const endPercent = getPositionFromValue(end)
  const total = max - min

  const defaultFormatLabel = (value: number, totalCount: number) => {
    const index = Math.round((value / 100) * totalCount)
    return `${index}`
  }

  const labelFormatter = formatLabel || defaultFormatLabel

  return (
    <div className={`relative ${className}`}>
      {/* Labels */}
      <div className="flex justify-between text-xs text-muted mb-1">
        <span>Oldest</span>
        <span>Newest</span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-2 bg-foreground/10 rounded-full cursor-pointer"
      >
        {/* Selected range */}
        <div
          className="absolute h-full bg-foreground/30 rounded-full"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`
          }}
        />

        {/* Start thumb */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-foreground rounded-full cursor-grab shadow-md ${
            dragging === 'start' ? 'cursor-grabbing scale-110' : 'hover:scale-110'
          } transition-transform`}
          style={{ left: `${startPercent}%` }}
          onMouseDown={handleMouseDown('start')}
        />

        {/* End thumb */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-foreground rounded-full cursor-grab shadow-md ${
            dragging === 'end' ? 'cursor-grabbing scale-110' : 'hover:scale-110'
          } transition-transform`}
          style={{ left: `${endPercent}%` }}
          onMouseDown={handleMouseDown('end')}
        />
      </div>

      {/* Value labels */}
      <div className="flex justify-between text-xs text-muted mt-1">
        <span>{labelFormatter(start, total)}</span>
        <span className="text-foreground">
          Showing {labelFormatter(end, total) === labelFormatter(start, total)
            ? `note ${labelFormatter(start, total)}`
            : `notes ${labelFormatter(start, total)} - ${labelFormatter(end, total)}`}
        </span>
        <span>{labelFormatter(end, total)}</span>
      </div>
    </div>
  )
}
