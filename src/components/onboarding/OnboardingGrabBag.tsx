'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { DEFAULT_CUSTOM_SCORES } from '@/types/pursuit'
import type { OnboardingSelection } from '@/types/pursuit'

const PLACEHOLDER_EXAMPLES = [
  'Journal daily',
  'Build neuroplasticity through stress inoculation',
  "Live for bell hooks' love ethic",
  'Learn about stoic philosophy',
  'Build improved mobility through stretching',
  'Play guitar',
  'Read one book a month',
  'Meditate every morning',
  'Write poetry',
  'Learn to cook Mediterranean food',
  'Run a half marathon',
  'Practice mindful parenting',
  'Build deeper friendships',
  'Learn a new language',
  'Volunteer in my community',
  'Develop a daily gratitude practice',
  'Master watercolor painting',
  'Study philosophy of mind',
  'Practice public speaking',
  'Build financial independence',
  'Learn woodworking',
  'Grow a vegetable garden',
  'Study the history of jazz',
  'Write letters to people I love',
  'Train for a century bike ride',
  'Study cognitive behavioral techniques',
  'Practice radical honesty',
  'Develop a consistent sleep routine',
  'Practice nonviolent communication',
  'Learn to ferment foods',
  'Study the Tao Te Ching',
  'Develop a home yoga practice',
  'Reconnect with nature through hiking',
  'Learn calligraphy',
  'Study behavioral economics',
  'Build a daily writing habit',
  'Deepen my spiritual practice',
]

interface OnboardingGrabBagProps {
  selections: OnboardingSelection[]
  onSelectionsChange: (selections: OnboardingSelection[]) => void
  onContinue: () => void
  onBack: () => void
}

function useRotatingPlaceholder(examples: string[], intervalMs = 3000) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * examples.length))
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false)
      // After fade out, switch text, then fade in
      setTimeout(() => {
        setIndex(prev => (prev + 1) % examples.length)
        setVisible(true)
      }, 300)
    }, intervalMs)

    return () => clearInterval(timer)
  }, [examples.length, intervalMs])

  return { text: examples[index], visible }
}

export function OnboardingGrabBag({
  selections,
  onSelectionsChange,
  onContinue,
  onBack,
}: OnboardingGrabBagProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { text: placeholderText, visible: placeholderVisible } = useRotatingPlaceholder(PLACEHOLDER_EXAMPLES)

  const selectedLabels = new Set(selections.map(s => s.label))

  const handleAdd = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || selectedLabels.has(trimmed)) return

    const newItem: OnboardingSelection = {
      label: trimmed,
      domainScores: { ...DEFAULT_CUSTOM_SCORES },
      isPredefined: false,
    }
    onSelectionsChange([...selections, newItem])
    setInput('')
    inputRef.current?.focus()
  }, [input, selectedLabels, selections, onSelectionsChange])

  const handleRemove = useCallback((label: string) => {
    onSelectionsChange(selections.filter(s => s.label !== label))
  }, [selections, onSelectionsChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <h2 className="text-xl font-semibold text-foreground text-center mb-2">
          What do you want to work on?
        </h2>
        <p className="text-sm text-muted text-center mb-10">
          Add anything that matters to you. You can always change these later.
        </p>

        {/* Input with rotating placeholder */}
        <div className="relative mb-8">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-12 px-4 pr-20 text-sm border-2 border-border rounded-xl bg-transparent text-foreground focus:border-foreground focus:outline-none transition-colors"
            placeholder=" "
          />
          {/* Custom animated placeholder */}
          {!input && (
            <span
              className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted/40 pointer-events-none transition-opacity duration-300 ${
                placeholderVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {placeholderText}
            </span>
          )}
          <button
            onClick={handleAdd}
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium rounded-lg bg-foreground text-background disabled:opacity-30 transition-opacity"
          >
            Add
          </button>
        </div>

        {/* Selected pursuits */}
        {selections.length > 0 && (
          <div className="space-y-3 mb-8">
            {selections.map((selection) => (
              <div
                key={selection.label}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-foreground/[0.02]"
              >
                <span className="text-sm text-foreground">{selection.label}</span>
                <button
                  onClick={() => handleRemove(selection.label)}
                  className="text-muted hover:text-foreground transition-colors shrink-0"
                  title="Remove"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-border">
          <button
            onClick={onBack}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Back
          </button>
          <Button onClick={onContinue} disabled={selections.length === 0}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
