'use client'

import { useRef, useState, useEffect } from 'react'
import { AnimatedCharacter } from './AnimatedCharacter'
import type { Word } from '@/hooks/useCharacterBuffer'

interface AnimatedWordProps {
  word: Word
  isFading: boolean
  isFaded: boolean
  recentCharIds?: Set<string>
  shouldShake?: boolean
}

export function AnimatedWord({
  word,
  isFading,
  isFaded,
  recentCharIds = new Set(),
  shouldShake = false,
}: AnimatedWordProps) {
  const wordRef = useRef<HTMLSpanElement>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [isExiting, setIsExiting] = useState(false)

  // Capture dimensions when fading starts so we can preserve space
  useEffect(() => {
    if (isFading && wordRef.current && !dimensions) {
      const rect = wordRef.current.getBoundingClientRect()
      setDimensions({ width: rect.width, height: rect.height })
      setIsExiting(true)
    }
  }, [isFading, dimensions])

  // Words stay invisible but maintain space after fading - never collapse
  // This keeps words on their original row
  if (isFaded) {
    // Render an invisible placeholder to maintain row structure
    if (dimensions) {
      return (
        <span
          className="animated-word"
          style={{
            display: 'inline-block',
            width: dimensions.width,
            height: dimensions.height,
            visibility: 'hidden',
          }}
        />
      )
    }
    return null
  }

  // During exit animation: apply fade class but keep natural flow (no dimension changes)
  if (isExiting) {
    return (
      <span
        ref={wordRef}
        className="animated-word word-fading"
        onAnimationEnd={() => {
          setIsExiting(false)
        }}
      >
        {word.characters.map((char) => (
          <AnimatedCharacter
            key={char.id}
            character={char}
            isNew={false}
          />
        ))}
      </span>
    )
  }

  // Normal rendering
  return (
    <span
      ref={wordRef}
      className={`animated-word ${shouldShake ? 'word-protected-shake' : ''}`}
    >
      {word.characters.map((char) => (
        <AnimatedCharacter
          key={char.id}
          character={char}
          isNew={recentCharIds.has(char.id)}
        />
      ))}
    </span>
  )
}
