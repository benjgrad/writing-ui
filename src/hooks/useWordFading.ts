'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Word } from './useCharacterBuffer'

const FADE_DELAY_MS = 30000 // 30 seconds
const FADE_ANIMATION_MS = 1000 // 1 second animation
const CHECK_INTERVAL_MS = 100 // Check every 100ms for smooth timing

interface WordWithMeta extends Word {
  lineIndex: number
  wordIndex: number
  lineId: string
}

interface UseWordFadingOptions {
  words: WordWithMeta[]
  enabled?: boolean
}

export function useWordFading({ words, enabled = true }: UseWordFadingOptions) {
  // Track which words are currently fading (in animation)
  const [fadingWordIds, setFadingWordIds] = useState<Set<string>>(new Set())
  // Track which words have fully faded (animation complete)
  const [fadedWordIds, setFadedWordIds] = useState<Set<string>>(new Set())

  // Check for words that need to start fading
  useEffect(() => {
    if (!enabled) return

    const checkFades = () => {
      const now = Date.now()

      words.forEach((word) => {
        // Only fade completed words (those with completedAt set)
        if (!word.completedAt) return
        // Skip if already fading or faded
        if (fadingWordIds.has(word.id) || fadedWordIds.has(word.id)) return
        // Check if enough time has passed since word was completed
        if (now - word.completedAt >= FADE_DELAY_MS) {
          // Start fading this word
          setFadingWordIds((prev) => new Set([...prev, word.id]))

          // After animation completes, mark as fully faded
          setTimeout(() => {
            setFadingWordIds((prev) => {
              const next = new Set(prev)
              next.delete(word.id)
              return next
            })
            setFadedWordIds((prev) => new Set([...prev, word.id]))
          }, FADE_ANIMATION_MS)
        }
      })
    }

    // Initial check
    checkFades()

    // Set up interval for continuous checking
    const intervalId = setInterval(checkFades, CHECK_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [words, enabled, fadingWordIds, fadedWordIds])

  // Check if all visible words have faded
  const allFaded = useMemo(() => {
    // Only consider words that have content and have been completed
    const completedWords = words.filter(
      (w) => w.characters.length > 0 && w.completedAt !== null
    )
    if (completedWords.length === 0) return true

    return completedWords.every((w) => fadedWordIds.has(w.id))
  }, [words, fadedWordIds])

  // Get currently visible words (not yet faded)
  const visibleWords = useMemo(() => {
    return words.filter((w) => !fadedWordIds.has(w.id))
  }, [words, fadedWordIds])

  // Get faded words for history view
  const fadedWords = useMemo(() => {
    return words.filter((w) => fadedWordIds.has(w.id))
  }, [words, fadedWordIds])

  // Check if a specific word is currently fading
  const isWordFading = useCallback(
    (wordId: string) => fadingWordIds.has(wordId),
    [fadingWordIds]
  )

  // Check if a specific word has faded
  const isWordFaded = useCallback(
    (wordId: string) => fadedWordIds.has(wordId),
    [fadedWordIds]
  )

  // Reset all fade states (useful when loading new document)
  const resetFadeStates = useCallback(() => {
    setFadingWordIds(new Set())
    setFadedWordIds(new Set())
  }, [])

  // Manually mark words as faded (for history loading)
  const markAllAsFaded = useCallback((wordIds: string[]) => {
    setFadedWordIds(new Set(wordIds))
  }, [])

  return {
    fadingWordIds,
    fadedWordIds,
    allFaded,
    visibleWords,
    fadedWords,
    isWordFading,
    isWordFaded,
    resetFadeStates,
    markAllAsFaded,
  }
}
