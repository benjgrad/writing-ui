'use client'

import { useRef, useState, useEffect } from 'react'
import { AnimatedCharacter } from './AnimatedCharacter'
import type { Word } from '@/hooks/useCharacterBuffer'

interface AnimatedWordProps {
  word: Word
  isFading: boolean
  isFaded: boolean
  recentCharIds?: Set<string>
}

export function AnimatedWord({
  word,
  isFading,
  isFaded,
  recentCharIds = new Set(),
}: AnimatedWordProps) {
  const wordRef = useRef<HTMLSpanElement>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const [isCollapsing, setIsCollapsing] = useState(false)

  // Capture dimensions when fading starts so we can preserve space
  useEffect(() => {
    if (isFading && wordRef.current && !dimensions) {
      const rect = wordRef.current.getBoundingClientRect()
      setDimensions({ width: rect.width, height: rect.height })
      setIsExiting(true)
    }
  }, [isFading, dimensions])

  // Only return null after both exit and collapse animations complete
  if (isFaded && !isExiting && !isCollapsing) {
    return null
  }

  // Collapsing state: empty span that slowly shrinks to zero width
  if (isCollapsing && dimensions) {
    return (
      <span
        className="word-collapsing"
        style={{
          display: 'inline-block',
          width: dimensions.width,
          height: dimensions.height,
        }}
        onAnimationEnd={() => setIsCollapsing(false)}
      />
    )
  }

  // During exit animation: word floats up while placeholder maintains space
  if (isExiting && dimensions) {
    return (
      <span
        style={{
          display: 'inline-block',
          width: dimensions.width,
          height: dimensions.height,
          position: 'relative',
        }}
      >
        {/* Floating word */}
        <span
          className="word-fading"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            whiteSpace: 'nowrap',
          }}
          onAnimationEnd={() => {
            setIsExiting(false)
            setIsCollapsing(true)
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
      </span>
    )
  }

  // Normal rendering
  return (
    <span
      ref={wordRef}
      style={{
        display: 'inline',
      }}
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
