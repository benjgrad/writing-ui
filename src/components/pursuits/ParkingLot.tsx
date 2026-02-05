'use client'

import { useState } from 'react'
import type { GoalWithMicroWins } from '@/types/goal'

interface ParkingLotProps {
  goals: GoalWithMicroWins[]
  onActivate: (goalId: string) => Promise<void>
  onArchive: (goalId: string) => Promise<void>
  canActivate: boolean // Whether there's room in active (< 3)
  onGatekeeperNeeded: (goalId: string) => void // When activation requires swap
  onAddToParkingLot?: (title: string) => Promise<void>
}

export function ParkingLot({
  goals,
  onActivate,
  onArchive,
  canActivate,
  onGatekeeperNeeded,
  onAddToParkingLot
}: ParkingLotProps) {
  const [newTitle, setNewTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleActivate = (goalId: string) => {
    if (canActivate) {
      onActivate(goalId)
    } else {
      onGatekeeperNeeded(goalId)
    }
  }

  const handleAdd = async () => {
    const trimmed = newTitle.trim()
    if (!trimmed || !onAddToParkingLot) return
    setIsAdding(true)
    try {
      await onAddToParkingLot(trimmed)
      setNewTitle('')
    } finally {
      setIsAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }

  if (goals.length === 0 && !onAddToParkingLot) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium text-[#64748b]">
          Parking Lot
        </h2>
        {goals.length > 0 && (
          <span className="text-xs text-[#94a3b8] bg-[#f1f5f9] px-2 py-0.5 rounded-full">
            {goals.length}
          </span>
        )}
      </div>

      <p className="text-sm text-[#94a3b8]">
        Future ambitions waiting for focus
      </p>

      {goals.length > 0 && (
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
      )}

      {onAddToParkingLot && (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a pursuit to the parking lot..."
            disabled={isAdding}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-[#e2e8f0] bg-white text-[#1e293b] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#6366f1] transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim() || isAdding}
            className="px-3 py-2 text-sm rounded-lg bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
