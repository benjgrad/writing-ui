'use client'

import { useEffect, useState } from 'react'
import { FloatingCoachButton } from './FloatingCoachButton'
import { GoalCoach } from '@/components/goals/GoalCoach'
import type { CoachingSession } from '@/types/goal'
import type { GoalData } from '@/hooks/useGoalCoaching'

interface CoachingProviderProps {
  children: React.ReactNode
}

// Custom event for opening coaching session from anywhere
declare global {
  interface WindowEventMap {
    'open-coaching-session': CustomEvent<{ sessionId: string }>
  }
}

export function openCoachingSession(sessionId: string) {
  window.dispatchEvent(new CustomEvent('open-coaching-session', { detail: { sessionId } }))
}

export function CoachingProvider({ children }: CoachingProviderProps) {
  const [sessionToOpen, setSessionToOpen] = useState<CoachingSession | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  // Listen for open-coaching-session events
  useEffect(() => {
    const handleOpenSession = async (event: CustomEvent<{ sessionId: string }>) => {
      try {
        const response = await fetch(`/api/coaching-sessions/${event.detail.sessionId}`)
        if (response.ok) {
          const session = await response.json()
          setSessionToOpen(session)
          setIsModalOpen(true)
          setIsMinimized(false)
        }
      } catch (err) {
        console.error('Error fetching coaching session:', err)
      }
    }

    window.addEventListener('open-coaching-session', handleOpenSession)
    return () => window.removeEventListener('open-coaching-session', handleOpenSession)
  }, [])

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setIsMinimized(false)
    setSessionToOpen(null)
  }

  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const handleGoalCreated = async (goalData: GoalData) => {
    // This shouldn't happen when opening an existing session, but handle it anyway
    handleCloseModal()
  }

  return (
    <>
      {children}
      <FloatingCoachButton />

      {/* Session-specific modal (opened from NotePanel links etc) */}
      {sessionToOpen && (
        <GoalCoach
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onMinimize={handleMinimize}
          isMinimized={isMinimized}
          onGoalCreated={handleGoalCreated}
          existingSession={sessionToOpen}
        />
      )}
    </>
  )
}
