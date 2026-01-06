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
      const timer = setTimeout(() => {
        setIsVisible(true)
        setAnimationClass('prompt-entering')
      }, 100)

      return () => clearTimeout(timer)
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
      className={`absolute inset-0 flex items-center justify-center p-8 ${animationClass}`}
      style={{
        opacity: opacity * (isVisible ? 1 : 0),
        pointerEvents: 'none', // Allow all events to pass through
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
              className="animate-pulse text-xl"
              style={{ color: '#1e293b', opacity: 0.6 }}
            >
              ...
            </span>
          </div>
        ) : (
          <p
            className="text-2xl md:text-3xl font-normal leading-relaxed"
            style={{
              color: '#1e293b',
              opacity: 0.8,
              fontStyle: 'italic',
            }}
          >
            &ldquo;{prompt}&rdquo;
          </p>
        )}
        <p
          className="mt-8 text-sm"
          style={{
            color: '#1e293b',
            opacity: 0.4,
          }}
        >
          Start typing to continue
        </p>
      </div>
    </div>
  )
}
