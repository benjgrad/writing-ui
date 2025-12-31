'use client'

import { useRef, useEffect } from 'react'
import { AnimatedWord } from './AnimatedWord'
import type { Line } from '@/hooks/useCharacterBuffer'

interface WritingLineProps {
  line: Line
  isCurrentLine: boolean
  isWordFading: (wordId: string) => boolean
  isWordFaded: (wordId: string) => boolean
  recentCharIds?: Set<string>
  onHeightChange?: (lineId: string, height: number) => void
}

export function WritingLine({
  line,
  isCurrentLine,
  isWordFading,
  isWordFaded,
  recentCharIds = new Set(),
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

  return (
    <div
      ref={lineRef}
      className="dream-text"
      style={{
        minHeight: '1.6em',
        // Keep words together - don't break mid-word
        wordBreak: 'keep-all',
        overflowWrap: 'break-word',
        whiteSpace: 'pre-wrap',
        textAlign: 'center',
      }}
    >
      {line.words.map((word) => (
        <AnimatedWord
          key={word.id}
          word={word}
          isFading={isWordFading(word.id)}
          isFaded={isWordFaded(word.id)}
          recentCharIds={recentCharIds}
        />
      ))}
    </div>
  )
}
