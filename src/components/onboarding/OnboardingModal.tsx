'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

const ONBOARDING_KEY = 'writing-onboarding-complete'

interface OnboardingStep {
  title: string
  description: string
  icon: React.ReactNode
}

const steps: OnboardingStep[] = [
  {
    title: 'Write freely',
    description: 'Start a new document and let your thoughts flow. Your words fade as you write, keeping you focused on the present moment.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    )
  },
  {
    title: 'Set meaningful goals',
    description: 'Use the Goal Coach to clarify what matters to you. Focus on up to three goals at a time for maximum impact.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    )
  },
  {
    title: 'Build your knowledge',
    description: 'Your writing is automatically analyzed to extract insights, creating a personal knowledge graph that grows with you.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <circle cx="4" cy="6" r="2" />
        <circle cx="20" cy="6" r="2" />
        <circle cx="4" cy="18" r="2" />
        <circle cx="20" cy="18" r="2" />
        <line x1="6" y1="6" x2="9" y2="10" />
        <line x1="15" y1="10" x2="18" y2="6" />
        <line x1="6" y1="18" x2="9" y2="14" />
        <line x1="15" y1="14" x2="18" y2="18" />
      </svg>
    )
  }
]

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem(ONBOARDING_KEY)
    if (!completed) {
      setIsOpen(true)
    }
  }, [])

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setIsOpen(false)
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  if (!isOpen) return null

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentStep ? 'bg-foreground' : 'bg-foreground/20'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-foreground/5 flex items-center justify-center text-foreground">
            {step.icon}
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {step.title}
          </h2>
          <p className="text-muted text-sm leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex flex-col gap-3">
          {isLastStep ? (
            <Link
              href="/write/new"
              onClick={handleComplete}
              className="w-full inline-flex items-center justify-center gap-2 h-11 px-6 bg-foreground text-background rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Start Writing
            </Link>
          ) : (
            <Button onClick={handleNext} className="w-full h-11">
              Continue
            </Button>
          )}
          <button
            onClick={handleSkip}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            {isLastStep ? 'Skip for now' : 'Skip intro'}
          </button>
        </div>
      </div>
    </div>
  )
}
