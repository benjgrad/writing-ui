'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Line } from './useCharacterBuffer'

interface UseLineManagerOptions {
  lines: Line[]
  currentLineIndex: number
  lineHeight?: number // Approximate height of a line in pixels
  enabled?: boolean
}

export function useLineManager({
  lines,
  currentLineIndex,
  lineHeight = 38, // ~24px font size * 1.6 line-height
  enabled = true,
}: UseLineManagerOptions) {
  // Track the scroll offset needed to keep current line centered
  const [scrollOffset, setScrollOffset] = useState(0)

  // Ref to track line element heights for more accurate calculations
  const lineHeightsRef = useRef<Map<string, number>>(new Map())

  // Calculate total height of all lines before the current one
  const calculateOffsetForLine = useCallback(
    (targetLineIndex: number) => {
      let offset = 0

      for (let i = 0; i < targetLineIndex; i++) {
        const line = lines[i]
        const measuredHeight = lineHeightsRef.current.get(line.id)
        offset += measuredHeight ?? lineHeight
      }

      return offset
    },
    [lines, lineHeight]
  )

  // Update scroll offset when current line changes
  useEffect(() => {
    if (!enabled) return

    const offset = calculateOffsetForLine(currentLineIndex)
    setScrollOffset(-offset)
  }, [currentLineIndex, calculateOffsetForLine, enabled])

  // Register a line's measured height
  const registerLineHeight = useCallback((lineId: string, height: number) => {
    lineHeightsRef.current.set(lineId, height)
  }, [])

  // Unregister a line's height (when line is removed)
  const unregisterLineHeight = useCallback((lineId: string) => {
    lineHeightsRef.current.delete(lineId)
  }, [])

  // Get the transform style for the lines container
  const containerStyle = {
    transform: `translateY(${scrollOffset}px)`,
    transition: 'transform 300ms ease-out',
  }

  return {
    scrollOffset,
    containerStyle,
    registerLineHeight,
    unregisterLineHeight,
  }
}
