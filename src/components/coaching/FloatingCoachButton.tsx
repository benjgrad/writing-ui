'use client'

import { useState } from 'react'
import { GoalCoach } from '@/components/goals/GoalCoach'
import type { CoachingSession, GoalWithMicroWins } from '@/types/goal'
import type { GoalData } from '@/hooks/useGoalCoaching'

interface FloatingCoachButtonProps {
  onGoalCreated?: (goal: GoalWithMicroWins) => void
  onGoalUpdated?: () => void
}

export function FloatingCoachButton({ onGoalCreated, onGoalUpdated }: FloatingCoachButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [recentSession, setRecentSession] = useState<CoachingSession | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch most recent coaching session when button is clicked
  const handleOpen = async () => {
    // If already open but minimized, just expand
    if (isOpen && isMinimized) {
      setIsMinimized(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/coaching-sessions?limit=1&active=true')
      if (response.ok) {
        const data = await response.json()
        if (data.sessions && data.sessions.length > 0) {
          // Fetch full session with messages
          const fullResponse = await fetch(`/api/coaching-sessions/${data.sessions[0].id}`)
          if (fullResponse.ok) {
            const fullSession = await fullResponse.json()
            setRecentSession(fullSession)
          }
        } else {
          setRecentSession(null)
        }
      }
    } catch (err) {
      console.error('Error fetching recent session:', err)
      setRecentSession(null)
    } finally {
      setLoading(false)
      setIsOpen(true)
      setIsMinimized(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsMinimized(false)
    setRecentSession(null)
  }

  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const handleGoalCreated = async (goalData: GoalData, sessionId: string | null) => {
    // Create the goal via API
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: goalData.title,
          why_root: goalData.whyRoot,
          micro_win: goalData.microWin
        })
      })

      if (response.ok) {
        const newGoal = await response.json()

        // Link session to goal
        if (sessionId) {
          await fetch(`/api/coaching-sessions/${sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal_id: newGoal.id })
          })
        }

        onGoalCreated?.(newGoal)
      }
    } catch (err) {
      console.error('Error creating goal:', err)
    }

    handleClose()
  }

  // Hide FAB when coach is open and not minimized
  const showFab = !isOpen || isMinimized

  return (
    <>
      {/* Floating Action Button - hidden when coach is expanded */}
      {showFab && !isMinimized && (
        <button
          onClick={handleOpen}
          disabled={loading}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center disabled:opacity-70"
          title="Open Coach"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            // Whistle icon
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
            >
              {/* Whistle body */}
              <ellipse cx="14" cy="14" rx="7" ry="5" />
              {/* Whistle mouthpiece */}
              <path d="M7 14H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h3" />
              {/* Whistle ring/loop */}
              <circle cx="3" cy="8" r="2" />
              {/* Sound waves */}
              <path d="M19 9c1 1 1.5 2 1.5 3" />
              <path d="M21 7c1.5 1.5 2.5 3.5 2.5 5.5" />
            </svg>
          )}
        </button>
      )}

      {/* Goal Coach Modal */}
      <GoalCoach
        isOpen={isOpen}
        onClose={handleClose}
        onMinimize={handleMinimize}
        isMinimized={isMinimized}
        onGoalCreated={handleGoalCreated}
        existingSession={recentSession || undefined}
        onGoalUpdated={onGoalUpdated}
      />
    </>
  )
}
