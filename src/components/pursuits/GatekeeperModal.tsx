'use client'

import { useState } from 'react'
import type { GoalWithMicroWins } from '@/types/goal'

interface GatekeeperModalProps {
  isOpen: boolean
  onClose: () => void
  activeGoals: GoalWithMicroWins[]
  incomingGoal: GoalWithMicroWins | null
  onSwap: (activeGoalId: string, parkingGoalId: string) => Promise<void>
}

export function GatekeeperModal({
  isOpen,
  onClose,
  activeGoals,
  incomingGoal,
  onSwap
}: GatekeeperModalProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [isSwapping, setIsSwapping] = useState(false)

  if (!isOpen || !incomingGoal) return null

  const handleSwap = async () => {
    if (!selectedGoalId) return

    setIsSwapping(true)
    await onSwap(selectedGoalId, incomingGoal.id)
    setIsSwapping(false)
    setSelectedGoalId(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 gatekeeper-overlay flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#fef3c7] flex items-center justify-center">
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
              className="text-[#f59e0b]"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-[#1e293b] mb-2">
            Rule of Three
          </h2>
          <p className="text-[#64748b]">
            You can only focus on 3 pursuits at once. Choose one to move to the Parking Lot.
          </p>
        </div>

        {/* Incoming goal */}
        <div className="mb-6 p-4 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0]">
          <div className="text-xs text-[#16a34a] font-medium mb-1">Incoming</div>
          <div className="font-medium text-[#1e293b]">{incomingGoal.title}</div>
        </div>

        {/* Select goal to park */}
        <div className="mb-6">
          <div className="text-sm text-[#64748b] mb-3">
            Select a pursuit to move to Parking Lot:
          </div>
          <div className="space-y-2">
            {activeGoals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => setSelectedGoalId(goal.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selectedGoalId === goal.id
                    ? 'border-[#6366f1] bg-[#eef2ff]'
                    : 'border-[#e2e8f0] hover:border-[#cbd5e1]'
                }`}
              >
                <div className="font-medium text-[#1e293b]">{goal.title}</div>
                {goal.why_root && (
                  <div className="text-xs text-[#64748b] mt-1 line-clamp-1">
                    {goal.why_root}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSwap}
            disabled={!selectedGoalId || isSwapping}
            className="flex-1 px-4 py-3 rounded-xl bg-[#6366f1] text-white hover:bg-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSwapping ? 'Swapping...' : 'Swap Pursuits'}
          </button>
        </div>
      </div>
    </div>
  )
}
