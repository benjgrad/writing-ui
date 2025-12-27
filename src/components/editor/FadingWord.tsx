'use client'

import { memo } from 'react'

interface FadingWordProps {
  word: string
  isFaded: boolean
}

export const FadingWord = memo(function FadingWord({ word, isFaded }: FadingWordProps) {
  return (
    <span className={`fading-word ${isFaded ? 'faded' : ''}`}>
      {word}{' '}
    </span>
  )
})
