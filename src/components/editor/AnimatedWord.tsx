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
  // Collapse happens in two phases: first set explicit width, then trigger transition to 0
  const [collapsePhase, setCollapsePhase] = useState<'none' | 'preparing' | 'collapsing'>('none')

  // Capture dimensions when fading starts so we can preserve space
  useEffect(() => {
    if (isFading && wordRef.current && !dimensions) {
      const rect = wordRef.current.getBoundingClientRect()
      setDimensions({ width: rect.width, height: rect.height })
      setIsExiting(true)
    }
  }, [isFading, dimensions])

  // When entering collapse preparation phase, wait one frame then start actual collapse
  useEffect(() => {
    if (collapsePhase === 'preparing') {
      // Use requestAnimationFrame to ensure the browser has rendered with explicit width
      // before we trigger the transition to width: 0
      const frameId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setCollapsePhase('collapsing')
        })
      })
      return () => cancelAnimationFrame(frameId)
    }
  }, [collapsePhase])

  // Only return null after collapse animation completes
  if (isFaded && !isExiting && collapsePhase === 'none') {
    return null
  }

  // Collapsing state: two phases for smooth transition
  // Phase 1 (preparing): render with explicit width so browser knows starting point
  // Phase 2 (collapsing): apply width: 0 to trigger the CSS transition
  if (collapsePhase !== 'none' && dimensions) {
    return (
      <span
        className={`animated-word ${collapsePhase === 'collapsing' ? 'word-collapsing' : ''}`}
        style={{
          width: collapsePhase === 'preparing' ? dimensions.width : undefined,
          height: dimensions.height,
        }}
        onTransitionEnd={() => {
          if (collapsePhase === 'collapsing') {
            setCollapsePhase('none')
          }
        }}
      />
    )
  }

  // During exit animation: apply fade class but keep natural flow (no dimension changes)
  // This prevents the "jump" that happens when switching to absolute positioning
  if (isExiting) {
    return (
      <span
        ref={wordRef}
        className="animated-word word-fading"
        onAnimationEnd={() => {
          setIsExiting(false)
          setCollapsePhase('preparing')
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
