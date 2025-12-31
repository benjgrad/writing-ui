'use client'

import { useState, useEffect } from 'react'
import type { Character } from '@/hooks/useCharacterBuffer'

interface AnimatedCharacterProps {
  character: Character
  isNew?: boolean
}

export function AnimatedCharacter({
  character,
  isNew = false,
}: AnimatedCharacterProps) {
  const [animationClass, setAnimationClass] = useState(
    isNew ? 'char-entering' : ''
  )

  // Remove animation class after animation completes
  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => {
        setAnimationClass('')
      }, 150) // Match animation duration

      return () => clearTimeout(timer)
    }
  }, [isNew])

  return (
    <span
      className={animationClass}
      style={{
        display: 'inline-block',
        whiteSpace: 'pre', // Preserve spaces
      }}
    >
      {character.char}
    </span>
  )
}
