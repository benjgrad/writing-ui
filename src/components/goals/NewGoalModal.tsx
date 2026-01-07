'use client'

import { useState } from 'react'
import { WhyDrillingChat } from './WhyDrillingChat'

interface NewGoalModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateGoal: (title: string, whyRoot?: string) => Promise<{ error?: string }>
  defaultToParked?: boolean
}

type Step = 'title' | 'drilling' | 'skip-confirm'

export function NewGoalModal({
  isOpen,
  onClose,
  onCreateGoal,
  defaultToParked = false
}: NewGoalModalProps) {
  const [step, setStep] = useState<Step>('title')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setStep('drilling')
  }

  const handleDrillingComplete = async (whyRoot: string) => {
    setIsCreating(true)
    const result = await onCreateGoal(title.trim(), whyRoot)
    setIsCreating(false)

    if (result.error) {
      setError(result.error)
    } else {
      handleClose()
    }
  }

  const handleSkipDrilling = async () => {
    setIsCreating(true)
    const result = await onCreateGoal(title.trim())
    setIsCreating(false)

    if (result.error) {
      setError(result.error)
    } else {
      handleClose()
    }
  }

  const handleClose = () => {
    setStep('title')
    setTitle('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  // Show drilling chat
  if (step === 'drilling') {
    return (
      <WhyDrillingChat
        goalTitle={title}
        isOpen={true}
        onClose={() => setStep('title')}
        onComplete={handleDrillingComplete}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 gatekeeper-overlay flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#eef2ff] flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#6366f1]"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-[#1e293b] mb-2">
            {defaultToParked ? 'Park a Future Goal' : 'Add a New Goal'}
          </h2>
          <p className="text-[#64748b]">
            What do you want to achieve?
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#fef2f2] text-[#dc2626] text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleTitleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Learn to play guitar"
              className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] focus:border-[#6366f1] focus:outline-none transition-colors text-lg"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 rounded-xl border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isCreating}
              className="flex-1 px-4 py-3 rounded-xl bg-[#6366f1] text-white hover:bg-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue
            </button>
          </div>

          <button
            type="button"
            onClick={handleSkipDrilling}
            disabled={!title.trim() || isCreating}
            className="w-full text-sm text-[#94a3b8] hover:text-[#64748b] transition-colors disabled:opacity-50"
          >
            Skip the &ldquo;why&rdquo; conversation
          </button>
        </form>
      </div>
    </div>
  )
}
