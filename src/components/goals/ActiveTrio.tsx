'use client'

import type { GoalWithMicroWins } from '@/types/goal'
import { GoalCard } from './GoalCard'

interface ActiveTrioProps {
  goals: GoalWithMicroWins[]
  onUpdateMomentum: (goalId: string, momentum: number) => Promise<void>
  onCompleteMicroWin: (goalId: string, microWinId: string) => Promise<void>
  onAddMicroWin: (goalId: string, description: string) => Promise<void>
  onUpdateMicroWin?: (goalId: string, microWinId: string, description: string) => Promise<void>
  onDeleteMicroWin?: (goalId: string, microWinId: string) => Promise<void>
  onReorderMicroWins?: (goalId: string, orderedIds: string[]) => Promise<void>
  onUpdateGoal: (goalId: string, updates: { title?: string; why_root?: string }) => Promise<void>
  onMoveToParking: (goalId: string) => Promise<void>
  onArchive: (goalId: string) => Promise<void>
  onAddGoal: () => void
  onViewCoaching?: (goalId: string) => void
}

export function ActiveTrio({
  goals,
  onUpdateMomentum,
  onCompleteMicroWin,
  onAddMicroWin,
  onUpdateMicroWin,
  onDeleteMicroWin,
  onReorderMicroWins,
  onUpdateGoal,
  onMoveToParking,
  onArchive,
  onAddGoal,
  onViewCoaching
}: ActiveTrioProps) {
  // Ensure we only show max 3 active goals
  const activeGoals = goals.slice(0, 3)
  const emptySlots = 3 - activeGoals.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#1e293b]">
          Your Focus
        </h2>
        <span className="text-sm text-[#64748b]">
          {activeGoals.length}/3 active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activeGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onUpdateMomentum={(momentum) => onUpdateMomentum(goal.id, momentum)}
            onCompleteMicroWin={(microWinId) => onCompleteMicroWin(goal.id, microWinId)}
            onAddMicroWin={(description) => onAddMicroWin(goal.id, description)}
            onUpdateMicroWin={onUpdateMicroWin ? (microWinId, description) => onUpdateMicroWin(goal.id, microWinId, description) : undefined}
            onDeleteMicroWin={onDeleteMicroWin ? (microWinId) => onDeleteMicroWin(goal.id, microWinId) : undefined}
            onReorderMicroWins={onReorderMicroWins ? (orderedIds) => onReorderMicroWins(goal.id, orderedIds) : undefined}
            onUpdateGoal={(updates) => onUpdateGoal(goal.id, updates)}
            onMoveToParking={() => onMoveToParking(goal.id)}
            onArchive={() => onArchive(goal.id)}
            onViewCoaching={onViewCoaching ? () => onViewCoaching(goal.id) : undefined}
          />
        ))}

        {/* Empty slots - add goal cards */}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <button
            key={`empty-${index}`}
            onClick={onAddGoal}
            className="goal-card border-2 border-dashed border-[#e2e8f0] bg-transparent hover:border-[#6366f1] hover:bg-[#f8fafc] transition-all min-h-[200px] flex flex-col items-center justify-center gap-2 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-[#f1f5f9] flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#94a3b8]"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </div>
            <span className="text-sm text-[#64748b]">Add a goal</span>
          </button>
        ))}
      </div>
    </div>
  )
}
