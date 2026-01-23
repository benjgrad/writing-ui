'use client'

import { useState, useCallback } from 'react'
import { useGoals } from '@/hooks/useGoals'
import type { GoalData } from '@/hooks/useGoalCoaching'
import type { GoalWithMicroWins, CoachingSession } from '@/types/goal'

export function useGoalManagement() {
  const {
    activeGoals,
    parkedGoals,
    loading,
    error,
    createGoal,
    updateGoal,
    updateMomentum,
    completeMicroWin,
    addMicroWin,
    updateMicroWin,
    deleteMicroWin,
    reorderMicroWins,
    moveGoal,
    archiveGoal,
    refresh
  } = useGoals()

  const [showGoalCoach, setShowGoalCoach] = useState(false)
  const [showGatekeeper, setShowGatekeeper] = useState(false)
  const [gatekeeperGoal, setGatekeeperGoal] = useState<GoalWithMicroWins | null>(null)
  const [viewingSession, setViewingSession] = useState<CoachingSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(false)

  // Fetch coaching session for a goal
  const handleViewCoaching = useCallback(async (goalId: string) => {
    setLoadingSession(true)
    try {
      const response = await fetch(`/api/coaching-sessions?goal_id=${goalId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.sessions && data.sessions.length > 0) {
          const sessionWithMessages = data.sessions[0]
          const fullResponse = await fetch(`/api/coaching-sessions/${sessionWithMessages.id}`)
          if (fullResponse.ok) {
            const fullData = await fullResponse.json()
            setViewingSession(fullData.session)
          }
        }
      }
    } catch (err) {
      console.error('[useGoalManagement] Failed to fetch coaching session:', err)
    } finally {
      setLoadingSession(false)
    }
  }, [])

  // Handle goal created from coach
  const handleGoalCreated = useCallback(async (goalData: GoalData, sessionId: string | null) => {
    const status = activeGoals.length >= 3 ? 'parked' : 'active'
    const result = await createGoal(goalData.title, goalData.whyRoot, status)

    if (result.goal && goalData.microWin) {
      await addMicroWin(result.goal.id, goalData.microWin, true)
    }

    if (result.goal && sessionId) {
      try {
        await fetch(`/api/coaching-sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal_id: result.goal.id, is_active: false })
        })
      } catch (err) {
        console.error('[useGoalManagement] Failed to link session to goal:', err)
      }
    }

    setShowGoalCoach(false)
    await refresh()
  }, [activeGoals.length, createGoal, addMicroWin, refresh])

  // Handle momentum update
  const handleUpdateMomentum = useCallback(async (goalId: string, momentum: number) => {
    await updateMomentum(goalId, momentum)
  }, [updateMomentum])

  // Handle micro-win completion
  const handleCompleteMicroWin = useCallback(async (goalId: string, microWinId: string) => {
    await completeMicroWin(goalId, microWinId)
  }, [completeMicroWin])

  // Handle adding micro-win
  const handleAddMicroWin = useCallback(async (goalId: string, description: string) => {
    await addMicroWin(goalId, description, true)
  }, [addMicroWin])

  // Handle updating micro-win
  const handleUpdateMicroWin = useCallback(async (goalId: string, microWinId: string, description: string) => {
    await updateMicroWin(goalId, microWinId, description)
  }, [updateMicroWin])

  // Handle deleting micro-win
  const handleDeleteMicroWin = useCallback(async (goalId: string, microWinId: string) => {
    await deleteMicroWin(goalId, microWinId)
  }, [deleteMicroWin])

  // Handle reordering micro-wins
  const handleReorderMicroWins = useCallback(async (goalId: string, orderedIds: string[]) => {
    await reorderMicroWins(goalId, orderedIds)
  }, [reorderMicroWins])

  // Handle updating goal
  const handleUpdateGoal = useCallback(async (goalId: string, updates: { title?: string; why_root?: string }) => {
    await updateGoal(goalId, updates)
  }, [updateGoal])

  // Handle moving to parking lot
  const handleMoveToParking = useCallback(async (goalId: string) => {
    await moveGoal(goalId, 'parked')
  }, [moveGoal])

  // Handle activating from parking lot
  const handleActivate = useCallback(async (goalId: string) => {
    await moveGoal(goalId, 'active')
  }, [moveGoal])

  // Handle archiving
  const handleArchive = useCallback(async (goalId: string) => {
    await archiveGoal(goalId)
  }, [archiveGoal])

  // Handle gatekeeper trigger
  const handleGatekeeperNeeded = useCallback((goalId: string) => {
    const goal = parkedGoals.find(g => g.id === goalId)
    if (goal) {
      setGatekeeperGoal(goal)
      setShowGatekeeper(true)
    }
  }, [parkedGoals])

  // Handle goal swap from gatekeeper
  const handleSwap = useCallback(async (activeGoalId: string, parkingGoalId: string) => {
    await moveGoal(activeGoalId, 'parked')
    await moveGoal(parkingGoalId, 'active')
    await refresh()
  }, [moveGoal, refresh])

  // Close goal coach
  const closeGoalCoach = useCallback(() => {
    setShowGoalCoach(false)
  }, [])

  // Open goal coach
  const openGoalCoach = useCallback(() => {
    setShowGoalCoach(true)
  }, [])

  // Close viewing session
  const closeViewingSession = useCallback(() => {
    setViewingSession(null)
  }, [])

  // Close gatekeeper
  const closeGatekeeper = useCallback(() => {
    setShowGatekeeper(false)
    setGatekeeperGoal(null)
  }, [])

  return {
    // State
    activeGoals,
    parkedGoals,
    loading,
    error,
    showGoalCoach,
    showGatekeeper,
    gatekeeperGoal,
    viewingSession,
    loadingSession,

    // Modal controls
    openGoalCoach,
    closeGoalCoach,
    closeViewingSession,
    closeGatekeeper,

    // Goal handlers
    handleGoalCreated,
    handleUpdateMomentum,
    handleCompleteMicroWin,
    handleAddMicroWin,
    handleUpdateMicroWin,
    handleDeleteMicroWin,
    handleReorderMicroWins,
    handleUpdateGoal,
    handleMoveToParking,
    handleActivate,
    handleArchive,
    handleGatekeeperNeeded,
    handleSwap,
    handleViewCoaching,

    // Utilities
    refresh
  }
}
