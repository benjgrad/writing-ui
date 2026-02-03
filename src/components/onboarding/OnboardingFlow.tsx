'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/hooks/useSettings'
import { OnboardingPreamble } from './OnboardingPreamble'
import { OnboardingGrabBag } from './OnboardingGrabBag'
import { OnboardingSummary } from './OnboardingSummary'
import type { OnboardingSelection, OnboardingState } from '@/types/pursuit'

type Step = 'preamble' | 'grab_bag' | 'summary'

interface OnboardingFlowProps {
  children: React.ReactNode
}

export function OnboardingFlow({ children }: OnboardingFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('preamble')
  const [selections, setSelections] = useState<OnboardingSelection[]>([])
  const [isCreating, setIsCreating] = useState(false)

  const { value: onboardingState, updateValue: setOnboardingState, isLoaded } = useSettings<OnboardingState>({
    key: 'onboarding',
    defaultValue: { completed: false },
    localStorageKey: 'writing-onboarding-state',
  })

  const handleSkip = useCallback(() => {
    setOnboardingState({
      completed: true,
      completedAt: new Date().toISOString(),
    })
  }, [setOnboardingState])

  const handleBegin = useCallback(async () => {
    if (selections.length === 0) return
    setIsCreating(true)

    try {
      const response = await fetch('/api/pursuits/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections: selections.map((s) => ({
            title: s.label,
            domain_scores: s.domainScores,
            is_predefined: s.isPredefined,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create pursuits')
      }

      setOnboardingState({
        completed: true,
        completedAt: new Date().toISOString(),
        selections,
      })

      router.refresh()
    } catch (err) {
      console.error('Error creating pursuits:', err)
    } finally {
      setIsCreating(false)
    }
  }, [selections, setOnboardingState, router])

  // Don't render until we know the onboarding state from the API
  if (!isLoaded) {
    return null
  }

  // If onboarding is already complete, render the dashboard
  if (onboardingState.completed) {
    return <>{children}</>
  }

  // Render the onboarding flow full-page
  switch (step) {
    case 'preamble':
      return (
        <OnboardingPreamble
          onContinue={() => setStep('grab_bag')}
          onSkip={handleSkip}
        />
      )
    case 'grab_bag':
      return (
        <OnboardingGrabBag
          selections={selections}
          onSelectionsChange={setSelections}
          onContinue={() => setStep('summary')}
          onBack={() => setStep('preamble')}
        />
      )
    case 'summary':
      return (
        <OnboardingSummary
          selections={selections}
          onBegin={handleBegin}
          onBack={() => setStep('grab_bag')}
          isCreating={isCreating}
        />
      )
  }
}
