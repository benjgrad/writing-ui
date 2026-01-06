'use client'

import { useRef, useEffect, useMemo } from 'react'
import { AnimatedWord } from './AnimatedWord'
import type { Line } from '@/hooks/useCharacterBuffer'

interface WritingLineProps {
  line: Line
  isCurrentLine: boolean
  currentVisualRowId?: string
  isWordFading: (wordId: string) => boolean
  isWordFaded: (wordId: string) => boolean
  recentCharIds?: Set<string>
  deletionBlocked?: boolean
  protectedWordIds?: Set<string>
  onHeightChange?: (lineId: string, height: number) => void
}

export function WritingLine({
  line,
  isCurrentLine,
  currentVisualRowId,
  isWordFading,
  isWordFaded,
  recentCharIds = new Set(),
  deletionBlocked = false,
  protectedWordIds = new Set(),
  onHeightChange,
}: WritingLineProps) {
  const lineRef = useRef<HTMLDivElement>(null)

  // Report height changes for scroll calculations
  useEffect(() => {
    if (!lineRef.current || !onHeightChange) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onHeightChange(line.id, entry.contentRect.height)
      }
    })

    observer.observe(lineRef.current)

    return () => observer.disconnect()
  }, [line.id, onHeightChange])

  // Group words by their visualRowId
  const wordsByRow = useMemo(() => {
    const groups = new Map<string, typeof line.words>()
    for (const word of line.words) {
      const rowId = word.visualRowId || 'default'
      if (!groups.has(rowId)) groups.set(rowId, [])
      groups.get(rowId)!.push(word)
    }
    return Array.from(groups.entries())
  }, [line.words])

  // Render each visual row separately
  return (
    <div ref={lineRef}>
      {wordsByRow.map(([rowId, words]) => {
        // Check if all words in this row are fully faded (not just fading)
        const allWordsFaded = words.every((w) => isWordFaded(w.id))
        const isActiveRow = isCurrentLine && rowId === currentVisualRowId

        return (
          <div
            key={rowId}
            className={`dream-text visual-row ${allWordsFaded && !isActiveRow ? 'visual-row-empty' : ''}`}
            style={{
              minHeight: allWordsFaded && !isActiveRow ? 0 : '1.6em',
              wordBreak: 'keep-all',
              overflowWrap: 'normal',
              whiteSpace: 'pre-wrap',
              textAlign: 'center',
            }}
          >
            {words.map((word) => (
              <AnimatedWord
                key={word.id}
                word={word}
                isFading={isWordFading(word.id)}
                isFaded={isWordFaded(word.id)}
                recentCharIds={recentCharIds}
                shouldShake={deletionBlocked && protectedWordIds.has(word.id)}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
