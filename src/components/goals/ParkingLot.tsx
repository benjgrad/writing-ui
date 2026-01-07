'use client'

import type { GoalWithMicroWins } from '@/types/goal'

interface ParkingLotProps {
  goals: GoalWithMicroWins[]
  onActivate: (goalId: string) => Promise<void>
  onArchive: (goalId: string) => Promise<void>
  canActivate: boolean // Whether there's room in active (< 3)
  onGatekeeperNeeded: (goalId: string) => void // When activation requires swap
}

export function ParkingLot({
  goals,
  onActivate,
  onArchive,
  canActivate,
  onGatekeeperNeeded
}: ParkingLotProps) {
  const handleActivate = (goalId: string) => {
    if (canActivate) {
      onActivate(goalId)
    } else {
      onGatekeeperNeeded(goalId)
    }
  }

  if (goals.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium text-[#64748b]">
          Parking Lot
        </h2>
        <span className="text-xs text-[#94a3b8] bg-[#f1f5f9] px-2 py-0.5 rounded-full">
          {goals.length}
        </span>
      </div>

      <p className="text-sm text-[#94a3b8]">
        Future ambitions waiting for focus
      </p>

      <div className="space-y-3">
        {goals.map((goal) => (
          <div
            key={goal.id}
            className="parked-goal goal-card !p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium text-[#475569] truncate">
                  {goal.title}
                </h3>
                {goal.why_root && (
                  <p className="text-xs text-[#94a3b8] mt-1 line-clamp-1">
                    {goal.why_root}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleActivate(goal.id)}
                  className="text-xs px-3 py-1.5 rounded-full bg-[#6366f1] text-white hover:bg-[#4f46e5] transition-colors"
                >
                  Activate
                </button>
                <button
                  onClick={() => onArchive(goal.id)}
                  className="text-xs text-[#94a3b8] hover:text-[#ef4444] transition-colors p-1"
                  title="Archive"
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
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
