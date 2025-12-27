'use client'

import { useEffect, useState } from 'react'

interface ContinuationPromptProps {
  prompt: string | null
  isLoading: boolean
  onDismiss: () => void
}

export function ContinuationPrompt({ prompt, isLoading, onDismiss }: ContinuationPromptProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (prompt || isLoading) {
      const timer = setTimeout(() => setIsVisible(true), 100)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [prompt, isLoading])

  if (!prompt && !isLoading) return null

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center p-8 transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onDismiss}
    >
      <div className="max-w-2xl text-center">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-muted">
            <span className="animate-pulse">Thinking of a prompt...</span>
          </div>
        ) : (
          <p className="text-2xl md:text-3xl font-light text-muted leading-relaxed italic">
            &ldquo;{prompt}&rdquo;
          </p>
        )}
        <p className="mt-6 text-sm text-muted/60">
          Click anywhere or start typing to continue
        </p>
      </div>
    </div>
  )
}
