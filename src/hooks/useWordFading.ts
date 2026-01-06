'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Word } from './useCharacterBuffer'

const FADE_DELAY_MS = 30000 // 30 seconds
const FADE_ANIMATION_MS = 1000 // 1 second animation
const CHECK_INTERVAL_MS = 100 // Check every 100ms for smooth timing
const IDLE_COMPLETE_MS = 5000 // 5 seconds of inactivity marks word as implicitly complete

interface WordWithMeta extends Word {
  lineIndex: number
  wordIndex: number
  lineId: string
}

interface UseWordFadingOptions {
  words: WordWithMeta[]
  enabled?: boolean
  lastTypedAt?: number // Timestamp of last user input
  onFirstWordFadingOnLine?: (lineId: string) => void // Called when first word starts fading on a line
}

export function useWordFading({ words, enabled = true, lastTypedAt = 0, onFirstWordFadingOnLine }: UseWordFadingOptions) {
  // Track which words are currently fading (in animation)
  const [fadingWordIds, setFadingWordIds] = useState<Set<string>>(new Set())
  // Track which words have fully faded (animation complete)
  const [fadedWordIds, setFadedWordIds] = useState<Set<string>>(new Set())

  // Check for words that need to start fading
  useEffect(() => {
    if (!enabled) return

    const checkFades = () => {
      const now = Date.now()
      const isIdle = lastTypedAt > 0 && now - lastTypedAt >= IDLE_COMPLETE_MS

      words.forEach((word) => {
        // Skip if already fading or faded
        if (fadingWordIds.has(word.id) || fadedWordIds.has(word.id)) return

        // Determine effective completion time
        let effectiveCompletedAt: number | null = word.completedAt

        // For incomplete words: if user is idle for 5+ seconds, treat as implicitly complete
        if (!word.completedAt && word.characters.length > 0 && isIdle) {
          // Use the word's start time + idle threshold as effective completion time
          effectiveCompletedAt = lastTypedAt
        }

        // Skip if still not effectively complete
        if (!effectiveCompletedAt) return

        // Check if enough time has passed since word was (effectively) completed
        if (now - effectiveCompletedAt >= FADE_DELAY_MS) {
          // Check if this is the first word fading on its line
          const lineWords = words.filter((w) => w.lineId === word.lineId)
          const isFirstFadingOnLine = !lineWords.some(
            (w) => fadingWordIds.has(w.id) || fadedWordIds.has(w.id)
          )

          if (isFirstFadingOnLine && onFirstWordFadingOnLine) {
            onFirstWordFadingOnLine(word.lineId)
          }

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
  }, [words, enabled, fadingWordIds, fadedWordIds, lastTypedAt, onFirstWordFadingOnLine])

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
