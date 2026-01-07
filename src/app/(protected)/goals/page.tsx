'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useGoals } from '@/hooks/useGoals'
import { useAuth } from '@/hooks/useAuth'
import {
  ActiveTrio,
  ParkingLot,
  GatekeeperModal,
  GoalCoach
} from '@/components/goals'
import type { GoalData } from '@/hooks/useGoalCoaching'
import { Loading } from '@/components/ui/Loading'
import type { GoalWithMicroWins } from '@/types/goal'

export default function GoalsPage() {
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
    moveGoal,
    archiveGoal,
    refresh
  } = useGoals()

  const [showGoalCoach, setShowGoalCoach] = useState(false)
  const [showGatekeeper, setShowGatekeeper] = useState(false)
  const [gatekeeperGoal, setGatekeeperGoal] = useState<GoalWithMicroWins | null>(null)

  // Handle goal created from coach
  const handleGoalCreated = async (goalData: GoalData) => {
    // Determine status based on active goals count
    const status = activeGoals.length >= 3 ? 'parked' : 'active'

    // Create the goal
    const result = await createGoal(goalData.title, goalData.whyRoot, status)

    // If we have a micro-win, add it
    if (result.goal && goalData.microWin) {
      await addMicroWin(result.goal.id, goalData.microWin, true)
    }

    setShowGoalCoach(false)
    await refresh()
  }

  // Handle momentum update
  const handleUpdateMomentum = async (goalId: string, momentum: number) => {
    await updateMomentum(goalId, momentum)
  }

  // Handle micro-win completion
  const handleCompleteMicroWin = async (goalId: string, microWinId: string) => {
    await completeMicroWin(goalId, microWinId)
  }

  // Handle adding micro-win
  const handleAddMicroWin = async (goalId: string, description: string) => {
    await addMicroWin(goalId, description, true) // Set as current
  }

  // Handle updating goal
  const handleUpdateGoal = async (goalId: string, updates: { title?: string; why_root?: string }) => {
    await updateGoal(goalId, updates)
  }

  // Handle moving to parking lot
  const handleMoveToParking = async (goalId: string) => {
    await moveGoal(goalId, 'parked')
  }

  // Handle activating from parking lot
  const handleActivate = async (goalId: string) => {
    await moveGoal(goalId, 'active')
  }

  // Handle archiving
  const handleArchive = async (goalId: string) => {
    await archiveGoal(goalId)
  }

  // Handle gatekeeper trigger
  const handleGatekeeperNeeded = (goalId: string) => {
    const goal = parkedGoals.find(g => g.id === goalId)
    if (goal) {
      setGatekeeperGoal(goal)
      setShowGatekeeper(true)
    }
  }

  // Handle goal swap from gatekeeper
  const handleSwap = async (activeGoalId: string, parkingGoalId: string) => {
    // Move active to parked first
    await moveGoal(activeGoalId, 'parked')
    // Then move parked to active
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
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-[#f1f5f9]">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-[#64748b] hover:text-[#1e293b] transition-colors"
              >
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
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-[#1e293b]">
                Momentum Engine
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-[#64748b]">{user?.email}</span>
              <button
                onClick={signOut}
                className="text-sm text-[#64748b] hover:text-[#1e293b] transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#fef2f2] text-[#dc2626] text-sm">
            {error}
            <button
              onClick={refresh}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Active Goals - The Trio */}
        <section className="mb-12">
          <ActiveTrio
            goals={activeGoals}
            onUpdateMomentum={handleUpdateMomentum}
            onCompleteMicroWin={handleCompleteMicroWin}
            onAddMicroWin={handleAddMicroWin}
            onUpdateGoal={handleUpdateGoal}
            onMoveToParking={handleMoveToParking}
            onArchive={handleArchive}
            onAddGoal={() => setShowGoalCoach(true)}
          />
        </section>

        {/* Parking Lot */}
        <section className="mb-12">
          <ParkingLot
            goals={parkedGoals}
            onActivate={handleActivate}
            onArchive={handleArchive}
            canActivate={activeGoals.length < 3}
            onGatekeeperNeeded={handleGatekeeperNeeded}
          />
        </section>

        {/* Empty state */}
        {activeGoals.length === 0 && parkedGoals.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#f1f5f9] flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#94a3b8]"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-[#1e293b] mb-2">
              Start with one goal
            </h2>
            <p className="text-[#64748b] mb-6 max-w-md mx-auto">
              Focus on what matters most. The Rule of Three keeps you centered on no more than 3 active goals at once.
            </p>
            <button
              onClick={() => setShowGoalCoach(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6366f1] text-white hover:bg-[#4f46e5] transition-colors"
            >
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
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Add your first goal
            </button>
          </div>
        )}
      </main>

      {/* Goal Coach */}
      <GoalCoach
        isOpen={showGoalCoach}
        onClose={() => setShowGoalCoach(false)}
        onGoalCreated={handleGoalCreated}
      />

      <GatekeeperModal
        isOpen={showGatekeeper}
        onClose={() => {
          setShowGatekeeper(false)
          setGatekeeperGoal(null)
        }}
        activeGoals={activeGoals}
        incomingGoal={gatekeeperGoal}
        onSwap={handleSwap}
      />
    </div>
  )
}
