'use client'

import { useState, useEffect } from 'react'

interface IdlePromptProps {
  prompt: string | null
  isLoading: boolean
  opacity?: number
  onDismiss?: () => void
}

export function IdlePrompt({
  prompt,
  isLoading,
  opacity = 1,
  onDismiss,
}: IdlePromptProps) {
  const [animationClass, setAnimationClass] = useState('')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (prompt || isLoading) {
      // Small delay before showing to allow for smooth entrance
      const enterTimer = setTimeout(() => {
        setIsVisible(true)
        setAnimationClass('prompt-entering')
      }, 100)

      // Remove animation class after it completes to allow inline opacity to work
      const clearTimer = setTimeout(() => {
        setAnimationClass('')
      }, 600) // 500ms animation + 100ms delay

      return () => {
        clearTimeout(enterTimer)
        clearTimeout(clearTimer)
      }
    } else {
      setAnimationClass('prompt-exiting')
      const timer = setTimeout(() => {
        setIsVisible(false)
        setAnimationClass('')
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [prompt, isLoading])

  if (!isVisible && !prompt && !isLoading) {
    return null
  }

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center p-8 pt-14 ${animationClass}`}
      style={{
        opacity: opacity * (isVisible ? 1 : 0),
        pointerEvents: 'none', // Allow all events to pass through
        zIndex: 5,
      }}
    >
      <div
        className="max-w-2xl text-center cursor-pointer"
        style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          pointerEvents: 'none', // Don't capture any events - let scroll pass through
        }}
        onClick={onDismiss}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <span
              className="animate-pulse text-xl text-slate-800 dark:text-slate-200 opacity-60"
            >
              ...
            </span>
          </div>
        ) : (
          <p
            className="text-2xl md:text-3xl font-normal leading-relaxed text-slate-800 dark:text-slate-200 opacity-80 italic"
          >
            &ldquo;{prompt}&rdquo;
          </p>
        )}
        <p
          className="mt-8 text-sm text-slate-800 dark:text-slate-300 opacity-40"
        >
          Start typing to continue
        </p>
      </div>
    </div>
  )
}
