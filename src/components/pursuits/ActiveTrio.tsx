'use client'

import type { GoalWithMicroWins } from '@/types/goal'
import { PursuitCard } from './PursuitCard'

interface ActiveTrioProps {
  goals: GoalWithMicroWins[]
  parkedGoals?: GoalWithMicroWins[]
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
  onDeepenPursuit?: (goal: GoalWithMicroWins) => void
  onViewCoaching?: (goalId: string) => void
}

export function ActiveTrio({
  goals,
  parkedGoals = [],
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
  onDeepenPursuit,
  onViewCoaching
}: ActiveTrioProps) {
  // Ensure we only show max 3 active pursuits
  const activeGoals = goals.slice(0, 3)
  const emptySlots = 3 - activeGoals.length

  // Show parked pursuits in empty slots (up to available slots)
  const parkedForSlots = parkedGoals.slice(0, emptySlots)
  const remainingEmptySlots = emptySlots - parkedForSlots.length

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
          <PursuitCard
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

        {/* Parked pursuits ready to activate through coaching */}
        {parkedForSlots.map((goal) => (
          <button
            key={goal.id}
            onClick={() => onDeepenPursuit?.(goal)}
            className="goal-card border-2 border-dashed border-[#c7d2fe] bg-[#eef2ff]/50 hover:border-[#6366f1] hover:bg-[#eef2ff] transition-all min-h-[200px] flex flex-col items-center justify-center gap-3 cursor-pointer rounded-2xl p-6"
          >
            <div className="w-10 h-10 rounded-full bg-[#e0e7ff] flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#6366f1]"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <span className="text-sm font-medium text-[#4338ca]">
              {goal.title}
            </span>
            <span className="text-xs text-[#6366f1]/70">
              Start coaching to activate
            </span>
          </button>
        ))}

        {/* Remaining empty slots */}
        {Array.from({ length: remainingEmptySlots }).map((_, index) => (
          <button
            key={`empty-${index}`}
            onClick={onAddGoal}
            className="goal-card border-2 border-dashed border-[#e2e8f0] bg-transparent hover:border-[#6366f1] hover:bg-[#f8fafc] transition-all min-h-[200px] flex flex-col items-center justify-center gap-2 cursor-pointer rounded-2xl"
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
            <span className="text-sm text-[#64748b]">Add a pursuit</span>
          </button>
        ))}
      </div>
    </div>
  )
}
