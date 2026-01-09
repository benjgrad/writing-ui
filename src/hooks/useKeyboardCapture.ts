'use client'

import { useEffect, useCallback } from 'react'

interface KeyboardCaptureOptions {
  onCharacter: (char: string) => void
  onBackspace: () => void
  onEnter: () => void
  enabled: boolean
}

export function useKeyboardCapture({
  onCharacter,
  onBackspace,
  onEnter,
  enabled,
}: KeyboardCaptureOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      // If event came from our hidden textarea, let it through
      // (the textarea's onChange will handle it for mobile)
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return
      }

      // Block all navigation keys
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Home',
          'End',
          'PageUp',
          'PageDown',
        ].includes(e.key)
      ) {
        e.preventDefault()
        return
      }

      // Block selection and clipboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (['a', 'c', 'x', 'v', 'z', 'y'].includes(e.key.toLowerCase())) {
          e.preventDefault()
          return
        }
      }

      // Handle backspace
      if (e.key === 'Backspace') {
        e.preventDefault()
        onBackspace()
        return
      }

      // Handle enter
      if (e.key === 'Enter') {
        e.preventDefault()
        onEnter()
        return
      }

      // Handle tab as spaces (optional, or just block)
      if (e.key === 'Tab') {
        e.preventDefault()
        return
      }

      // Handle space
      if (e.key === ' ') {
        e.preventDefault()
        onCharacter(' ')
        return
      }

      // Handle printable characters (single char, no ctrl/meta modifier)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        onCharacter(e.key)
        return
      }
    },
    [enabled, onCharacter, onBackspace, onEnter]
  )

  useEffect(() => {
    if (!enabled) return

    // Use capture phase to intercept events before they reach other handlers
    document.addEventListener('keydown', handleKeyDown, { capture: true })

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [enabled, handleKeyDown])
}
