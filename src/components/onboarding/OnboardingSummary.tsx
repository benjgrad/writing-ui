'use client'

import { Button } from '@/components/ui/Button'
import type { OnboardingSelection } from '@/types/pursuit'

interface OnboardingSummaryProps {
  selections: OnboardingSelection[]
  onBegin: () => void
  onBack: () => void
  isCreating: boolean
}

export function OnboardingSummary({ selections, onBegin, onBack, isCreating }: OnboardingSummaryProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            Your pursuits
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            These become your initial pursuits. You can always add more,
            remove them, or change them later.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {selections.map((selection) => (
            <span
              key={selection.label}
              className="px-3 py-1.5 text-sm rounded-full bg-foreground text-background"
            >
              {selection.label}
            </span>
          ))}
        </div>

        <p className="text-xs text-muted leading-relaxed">
          To activate a pursuit, you&rsquo;ll work with a coach to
          clarify your motivation and identify a first step.
        </p>

        <div className="flex flex-col gap-3 pt-4">
          <Button onClick={onBegin} isLoading={isCreating} className="w-full h-11">
            Begin
          </Button>
          <button
            onClick={onBack}
            className="text-sm text-muted hover:text-foreground transition-colors"
            disabled={isCreating}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}
