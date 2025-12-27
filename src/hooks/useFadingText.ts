'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { WordWithTimestamp } from '@/types/document'

const FADE_DELAY_MS = 5000
const CHECK_INTERVAL_MS = 100

export function useFadingText(initialWords: WordWithTimestamp[] = []) {
  const [words, setWords] = useState<WordWithTimestamp[]>(initialWords)
  const [fadedIds, setFadedIds] = useState<Set<string>>(new Set())
  const inputRef = useRef('')

  // Check for words that should fade
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const newFadedIds = new Set<string>()

      words.forEach(word => {
        if (now - word.typedAt >= FADE_DELAY_MS) {
          newFadedIds.add(word.id)
        }
      })

      setFadedIds(prev => {
        if (newFadedIds.size !== prev.size) {
          return newFadedIds
        }
        // Check if sets are equal
        for (const id of newFadedIds) {
          if (!prev.has(id)) return newFadedIds
        }
        return prev
      })
    }, CHECK_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [words])

  const handleInput = useCallback((text: string) => {
    const prevText = inputRef.current
    inputRef.current = text

    // Find new words by comparing with previous input
    const prevWords = prevText.split(/\s+/).filter(Boolean)
    const currentWords = text.split(/\s+/).filter(Boolean)

    // If we have more words or the last word changed after a space
    if (currentWords.length > prevWords.length ||
        (prevText.endsWith(' ') && !text.endsWith(' ') && currentWords.length === prevWords.length)) {
      return
    }

    // Check if a new word was completed (space or newline added)
    if (text.endsWith(' ') || text.endsWith('\n')) {
      const lastWord = currentWords[currentWords.length - 1]
      if (lastWord && (!prevText.endsWith(' ') && !prevText.endsWith('\n'))) {
        setWords(prev => {
          // Check if this word already exists (by checking last word)
          const existingWordsCount = prev.length
          if (existingWordsCount >= currentWords.length) {
            return prev
          }
          return [...prev, {
            id: uuidv4(),
            word: lastWord,
            typedAt: Date.now()
          }]
        })
      }
    }
  }, [])

  const syncWords = useCallback((text: string) => {
    const textWords = text.split(/\s+/).filter(Boolean)
    const now = Date.now()

    setWords(textWords.map((word, index) => ({
      id: uuidv4(),
      word,
      typedAt: now - (textWords.length - index) * 100 // Stagger timestamps slightly
    })))
    inputRef.current = text
  }, [])

  const allFaded = words.length > 0 && fadedIds.size === words.length

  const rawContent = words.map(w => w.word).join(' ')

  const reset = useCallback(() => {
    setWords([])
    setFadedIds(new Set())
    inputRef.current = ''
  }, [])

  return {
    words,
    fadedIds,
    handleInput,
    syncWords,
    allFaded,
    rawContent,
    reset
  }
}
