'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'

export interface Character {
  id: string
  char: string
  typedAt: number
}

export interface Word {
  id: string
  characters: Character[]
  startedAt: number
  completedAt: number | null
  visualRowId: string // Permanent row assignment - words never change rows
}

export interface Line {
  id: string
  words: Word[]
}

interface CharacterBufferState {
  lines: Line[]
  currentLineIndex: number
  currentWordIndex: number
  currentVisualRowId: string // Tracks current visual row for new input
}

function createEmptyWord(visualRowId: string): Word {
  return {
    id: uuidv4(),
    characters: [],
    startedAt: Date.now(),
    completedAt: null,
    visualRowId,
  }
}

function createEmptyLine(visualRowId: string): Line {
  return {
    id: uuidv4(),
    words: [createEmptyWord(visualRowId)],
  }
}

export function useCharacterBuffer() {
  const [state, setState] = useState<CharacterBufferState>(() => {
    const initialVisualRowId = uuidv4()
    return {
      lines: [createEmptyLine(initialVisualRowId)],
      currentLineIndex: 0,
      currentWordIndex: 0,
      currentVisualRowId: initialVisualRowId,
    }
  })

  // Track the count of characters that have been deleted in the current "deletable window"
  // Reset when a new word is completed
  const deletedCharCountRef = useRef(0)
  const lastCompletedWordIdRef = useRef<string | null>(null)

  // Track newly added character IDs for animation
  const [recentCharIds, setRecentCharIds] = useState<Set<string>>(new Set())

  // Track when deletion is blocked (for shake feedback)
  const [deletionBlocked, setDeletionBlocked] = useState(false)
  const deletionBlockedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const addCharacter = useCallback((char: string) => {
    setState((prev) => {
      const newLines = structuredClone(prev.lines)
      let { currentLineIndex, currentWordIndex } = prev

      const currentLine = newLines[currentLineIndex]
      const currentWord = currentLine.words[currentWordIndex]

      if (char === ' ') {
        // Complete current word and start a new one
        if (currentWord.characters.length > 0) {
          currentWord.completedAt = Date.now()
          // Add space as last character of this word
          const spaceChar: Character = {
            id: uuidv4(),
            char: ' ',
            typedAt: Date.now(),
          }
          currentWord.characters.push(spaceChar)

          // Reset deletion tracking when a new word is completed
          deletedCharCountRef.current = 0
          lastCompletedWordIdRef.current = currentWord.id

          // Start new word (use current visual row)
          currentLine.words.push(createEmptyWord(prev.currentVisualRowId))
          currentWordIndex = currentLine.words.length - 1

          // Track for animation
          setRecentCharIds((prev) => new Set([...prev, spaceChar.id]))
          setTimeout(() => {
            setRecentCharIds((prev) => {
              const next = new Set(prev)
              next.delete(spaceChar.id)
              return next
            })
          }, 200)
        }
      } else {
        // Regular character - add to current word
        const newChar: Character = {
          id: uuidv4(),
          char,
          typedAt: Date.now(),
        }
        currentWord.characters.push(newChar)

        // Track for animation
        setRecentCharIds((prev) => new Set([...prev, newChar.id]))
        setTimeout(() => {
          setRecentCharIds((prev) => {
            const next = new Set(prev)
            next.delete(newChar.id)
            return next
          })
        }, 200)
      }

      return {
        lines: newLines,
        currentLineIndex,
        currentWordIndex,
        currentVisualRowId: prev.currentVisualRowId,
      }
    })
  }, [])

  const addNewLine = useCallback(() => {
    setState((prev) => {
      const newLines = structuredClone(prev.lines)
      const { currentLineIndex, currentWordIndex } = prev

      // Mark current word as complete if it has content
      const currentWord = newLines[currentLineIndex].words[currentWordIndex]
      if (currentWord.characters.length > 0) {
        currentWord.completedAt = Date.now()
        deletedCharCountRef.current = 0
        lastCompletedWordIdRef.current = currentWord.id
      }

      // Add new line with a new visual row
      const newVisualRowId = uuidv4()
      newLines.push(createEmptyLine(newVisualRowId))

      return {
        lines: newLines,
        currentLineIndex: newLines.length - 1,
        currentWordIndex: 0,
        currentVisualRowId: newVisualRowId,
      }
    })
  }, [])

  // Calculate max deletable characters (current word + last 2 complete words)
  const getMaxDeletableChars = useCallback((lines: Line[], currentLineIndex: number, currentWordIndex: number): number => {
    let charCount = 0
    let completeWordsFound = 0
    const MAX_COMPLETE_WORDS = 2

    // Start from current position and walk backwards
    for (let li = currentLineIndex; li >= 0; li--) {
      const line = lines[li]
      const startWi = li === currentLineIndex ? currentWordIndex : line.words.length - 1

      for (let wi = startWi; wi >= 0; wi--) {
        const word = line.words[wi]

        // Always include current incomplete word
        if (word.completedAt === null) {
          charCount += word.characters.length
        } else {
          // This is a complete word
          if (completeWordsFound < MAX_COMPLETE_WORDS) {
            charCount += word.characters.length
            completeWordsFound++
          } else {
            // We've reached the limit - stop here
            return charCount
          }
        }
      }
    }

    return charCount
  }, [])

  const deleteCharacter = useCallback(() => {
    setState((prev) => {
      const maxDeletable = getMaxDeletableChars(prev.lines, prev.currentLineIndex, prev.currentWordIndex)

      // If nothing is deletable, return early
      if (maxDeletable <= 0) return prev

      // Count total characters that exist in the deletable window
      let charsInWindow = 0
      let completeWordsInWindow = 0
      for (let li = prev.currentLineIndex; li >= 0; li--) {
        const line = prev.lines[li]
        const startWi = li === prev.currentLineIndex ? prev.currentWordIndex : line.words.length - 1
        for (let wi = startWi; wi >= 0; wi--) {
          const word = line.words[wi]
          if (word.completedAt === null) {
            charsInWindow += word.characters.length
          } else if (completeWordsInWindow < 2) {
            charsInWindow += word.characters.length
            completeWordsInWindow++
          }
        }
      }

      // If there are no characters in the deletable window, trigger shake and return
      if (charsInWindow <= 0) {
        setDeletionBlocked(true)
        if (deletionBlockedTimeoutRef.current) {
          clearTimeout(deletionBlockedTimeoutRef.current)
        }
        deletionBlockedTimeoutRef.current = setTimeout(() => {
          setDeletionBlocked(false)
        }, 300)
        return prev
      }

      const newLines = structuredClone(prev.lines)
      let { currentLineIndex, currentWordIndex } = prev

      const currentLine = newLines[currentLineIndex]
      const currentWord = currentLine.words[currentWordIndex]

      if (currentWord.characters.length > 0) {
        const lastChar = currentWord.characters[currentWord.characters.length - 1]
        currentWord.characters.pop()

        // If we removed a space, this word is no longer complete
        if (lastChar.char === ' ') {
          currentWord.completedAt = null
        }
      } else if (currentWordIndex > 0) {
        // Current word is empty, move to previous word
        currentLine.words.pop()
        currentWordIndex = currentLine.words.length - 1
        const prevWord = currentLine.words[currentWordIndex]

        // Remove trailing space from previous word if present
        if (prevWord.characters.length > 0) {
          const lastChar = prevWord.characters[prevWord.characters.length - 1]
          if (lastChar.char === ' ') {
            prevWord.characters.pop()
          }
        }
        prevWord.completedAt = null
      } else if (currentLineIndex > 0) {
        // At start of line, move to previous line
        newLines.pop()
        currentLineIndex = newLines.length - 1
        const prevLine = newLines[currentLineIndex]
        currentWordIndex = prevLine.words.length - 1

        const lastWord = prevLine.words[currentWordIndex]
        if (lastWord.characters.length > 0) {
          const lastChar = lastWord.characters[lastWord.characters.length - 1]
          if (lastChar.char === ' ') {
            lastWord.characters.pop()
          }
        }
        lastWord.completedAt = null
      }

      return {
        lines: newLines,
        currentLineIndex,
        currentWordIndex,
        currentVisualRowId: prev.currentVisualRowId,
      }
    })
  }, [getMaxDeletableChars])

  // Compute full content string for saving
  const fullContent = useMemo(() => {
    return state.lines
      .map((line) =>
        line.words.map((word) => word.characters.map((c) => c.char).join('')).join('')
      )
      .join('\n')
  }, [state.lines])

  // Get all words (flattened) for fading system
  const allWords = useMemo(() => {
    return state.lines.flatMap((line, lineIndex) =>
      line.words.map((word, wordIndex) => ({
        ...word,
        lineIndex,
        wordIndex,
        lineId: line.id,
      }))
    )
  }, [state.lines])

  // Start a new visual row (called when fading starts on current line)
  const startNewVisualRow = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentVisualRowId: uuidv4(),
    }))
  }, [])

  // Calculate protected word IDs (those beyond 2-word limit that can't be deleted)
  const protectedWordIds = useMemo(() => {
    const protectedIds = new Set<string>()
    let completeWordsFound = 0

    for (let li = state.currentLineIndex; li >= 0; li--) {
      const line = state.lines[li]
      const startWi = li === state.currentLineIndex ? state.currentWordIndex : line.words.length - 1

      for (let wi = startWi; wi >= 0; wi--) {
        const word = line.words[wi]
        if (word.completedAt !== null) {
          if (completeWordsFound >= 2) {
            protectedIds.add(word.id)
          }
          completeWordsFound++
        }
      }
    }
    return protectedIds
  }, [state.lines, state.currentLineIndex, state.currentWordIndex])

  return {
    lines: state.lines,
    currentLineIndex: state.currentLineIndex,
    currentWordIndex: state.currentWordIndex,
    currentVisualRowId: state.currentVisualRowId,
    addCharacter,
    addNewLine,
    deleteCharacter,
    startNewVisualRow,
    fullContent,
    allWords,
    recentCharIds,
    deletionBlocked,
    protectedWordIds,
  }
}
