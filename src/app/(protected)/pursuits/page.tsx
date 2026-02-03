'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useGoals } from '@/hooks/useGoals'
import { useAuth } from '@/hooks/useAuth'
import {
  ActiveTrio,
  ParkingLot,
  GatekeeperModal,
} from '@/components/goals'
import { PursuitCoach } from '@/components/pursuits'
import type { GoalData } from '@/hooks/useGoalCoaching'
import { Loading } from '@/components/ui/Loading'
import type { GoalWithMicroWins, CoachingSession } from '@/types/goal'

export default function PursuitsPage() {
  const { user, signOut } = useAuth()
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

  const [showCoach, setShowCoach] = useState(false)
  const [showGatekeeper, setShowGatekeeper] = useState(false)
  const [gatekeeperGoal, setGatekeeperGoal] = useState<GoalWithMicroWins | null>(null)
  const [viewingSession, setViewingSession] = useState<CoachingSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(false)
  const [deepeningGoal, setDeepeningGoal] = useState<GoalWithMicroWins | null>(null)

  const handleViewCoaching = async (goalId: string) => {
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
      console.error('[PursuitsPage] Failed to fetch coaching session:', err)
    } finally {
      setLoadingSession(false)
    }
  }

  const handleGoalCreated = async (goalData: GoalData, sessionId: string | null) => {
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
        console.error('[PursuitsPage] Failed to link session:', err)
      }
    }

    setShowCoach(false)
    await refresh()
  }

  const handleDeepenPursuit = (goal: GoalWithMicroWins) => {
    setDeepeningGoal(goal)
  }

  const handlePursuitActivated = async (goalId: string) => {
    if (activeGoals.length >= 3) {
      const goal = parkedGoals.find(g => g.id === goalId)
      if (goal) {
        setDeepeningGoal(null)
        setGatekeeperGoal(goal)
        setShowGatekeeper(true)
      }
      return
    }
    await moveGoal(goalId, 'active')
    setDeepeningGoal(null)
    await refresh()
  }

  const handleUpdateMomentum = async (goalId: string, momentum: number) => {
    await updateMomentum(goalId, momentum)
  }

  const handleCompleteMicroWin = async (goalId: string, microWinId: string) => {
    await completeMicroWin(goalId, microWinId)
  }

  const handleAddMicroWin = async (goalId: string, description: string) => {
    await addMicroWin(goalId, description, true)
  }

  const handleUpdateMicroWin = async (goalId: string, microWinId: string, description: string) => {
    await updateMicroWin(goalId, microWinId, description)
  }

  const handleDeleteMicroWin = async (goalId: string, microWinId: string) => {
    await deleteMicroWin(goalId, microWinId)
  }

  const handleReorderMicroWins = async (goalId: string, orderedIds: string[]) => {
    await reorderMicroWins(goalId, orderedIds)
  }

  const handleUpdateGoal = async (goalId: string, updates: { title?: string; why_root?: string }) => {
    await updateGoal(goalId, updates)
  }

  const handleMoveToParking = async (goalId: string) => {
    await moveGoal(goalId, 'parked')
  }

  const handleArchive = async (goalId: string) => {
    await archiveGoal(goalId)
  }

  const handleGatekeeperNeeded = (goalId: string) => {
    const goal = parkedGoals.find(g => g.id === goalId)
    if (goal) {
      setGatekeeperGoal(goal)
      setShowGatekeeper(true)
    }
  }

  const handleSwap = async (activeGoalId: string, parkingGoalId: string) => {
    await moveGoal(activeGoalId, 'parked')
    await moveGoal(parkingGoalId, 'active')
    await refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loading />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-[#f1f5f9]">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-[#64748b] hover:text-[#1e293b] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-[#1e293b]">
                Pursuits
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#64748b]">{user?.email}</span>
              <button onClick={signOut} className="text-sm text-[#64748b] hover:text-[#1e293b] transition-colors">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#fef2f2] text-[#dc2626] text-sm">
            {error}
            <button onClick={refresh} className="ml-2 underline hover:no-underline">Retry</button>
          </div>
        )}

        <section className="mb-12">
          <ActiveTrio
            goals={activeGoals}
            parkedGoals={parkedGoals}
            onUpdateMomentum={handleUpdateMomentum}
            onCompleteMicroWin={handleCompleteMicroWin}
            onAddMicroWin={handleAddMicroWin}
            onUpdateMicroWin={handleUpdateMicroWin}
            onDeleteMicroWin={handleDeleteMicroWin}
            onReorderMicroWins={handleReorderMicroWins}
            onUpdateGoal={handleUpdateGoal}
            onMoveToParking={handleMoveToParking}
            onArchive={handleArchive}
            onAddGoal={() => setShowCoach(true)}
            onDeepenPursuit={handleDeepenPursuit}
            onViewCoaching={handleViewCoaching}
          />
        </section>

        <section className="mb-12">
          <ParkingLot
            goals={parkedGoals}
            onActivate={async (goalId) => {
              const goal = parkedGoals.find(g => g.id === goalId)
              if (goal) handleDeepenPursuit(goal)
            }}
            onArchive={handleArchive}
            canActivate={activeGoals.length < 3}
            onGatekeeperNeeded={handleGatekeeperNeeded}
          />
        </section>

        {activeGoals.length === 0 && parkedGoals.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#f1f5f9] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#94a3b8]">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-[#1e293b] mb-2">
              Start with one pursuit
            </h2>
            <p className="text-[#64748b] mb-6 max-w-md mx-auto">
              Focus on what matters most. The Rule of Three keeps you centered on no more than 3 active pursuits at once.
            </p>
            <button
              onClick={() => setShowCoach(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6366f1] text-white hover:bg-[#4f46e5] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Add your first pursuit
            </button>
          </div>
        )}
      </main>

      {/* Pursuit Coach - New Pursuit */}
      <PursuitCoach
        isOpen={showCoach}
        onClose={() => setShowCoach(false)}
        onGoalCreated={handleGoalCreated}
      />

      {/* Pursuit Coach - Deepen & Activate */}
      <PursuitCoach
        isOpen={deepeningGoal !== null}
        onClose={() => setDeepeningGoal(null)}
        onGoalCreated={handleGoalCreated}
        goalToDeepen={deepeningGoal ? {
          id: deepeningGoal.id,
          title: deepeningGoal.title,
          why_root: deepeningGoal.why_root,
          micro_wins: deepeningGoal.micro_wins,
        } : undefined}
        onPursuitActivated={handlePursuitActivated}
        onGoalUpdated={refresh}
      />

      {/* Pursuit Coach - Continue Session */}
      <PursuitCoach
        isOpen={viewingSession !== null}
        onClose={() => setViewingSession(null)}
        onGoalCreated={handleGoalCreated}
        existingSession={viewingSession || undefined}
        onGoalUpdated={refresh}
      />

      {loadingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl p-6 shadow-xl">
            <Loading />
            <p className="mt-2 text-sm text-[#64748b]">Loading coaching history...</p>
          </div>
        </div>
      )}

      <GatekeeperModal
        isOpen={showGatekeeper}
        onClose={() => { setShowGatekeeper(false); setGatekeeperGoal(null) }}
        activeGoals={activeGoals}
        incomingGoal={gatekeeperGoal}
        onSwap={handleSwap}
      />
    </div>
  )
}
