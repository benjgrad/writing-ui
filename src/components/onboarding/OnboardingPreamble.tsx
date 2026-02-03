'use client'

import { Button } from '@/components/ui/Button'

interface OnboardingPreambleProps {
  onContinue: () => void
  onSkip: () => void
}

export function OnboardingPreamble({ onContinue, onSkip }: OnboardingPreambleProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-10">
        <div className="space-y-8">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            First Principle
          </h1>

          <p className="text-sm text-muted italic">This matters.</p>

          <div className="space-y-4 text-sm leading-relaxed text-foreground/80">
            <div>
              <p className="text-muted mb-2">A good life is not:</p>
              <p>pleasure &middot; success &middot; comfort &middot; virtue in isolation</p>
            </div>

            <div>
              <p className="text-muted mb-2">A good life is:</p>
              <p>
                excellent activity of the soul, over time,
                <br />
                in accordance with reason, within a community.
              </p>
            </div>
          </div>

          <p className="text-sm text-muted">
            That gives us the structure.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button onClick={onContinue} className="w-full h-11">
            Continue
          </Button>
          <button
            onClick={onSkip}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Skip intro
          </button>
        </div>
      </div>
    </div>
  )
}
