'use client'

import { useGoalManagement } from '@/hooks/useGoalManagement'
import {
  ActiveTrio,
  ParkingLot,
  GatekeeperModal,
  GoalCoach
} from '@/components/goals'
import { Loading } from '@/components/ui/Loading'

export function HomeGoalsSection() {
  const {
    activeGoals,
    parkedGoals,
    loading,
    error,
    showGoalCoach,
    showGatekeeper,
    gatekeeperGoal,
    viewingSession,
    loadingSession,
    openGoalCoach,
    closeGoalCoach,
    closeViewingSession,
    closeGatekeeper,
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
    refresh
  } = useGoalManagement()

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Loading />
      </div>
    )
  }

  return (
    <div>
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
      <section className="mb-8">
        <ActiveTrio
          goals={activeGoals}
          onUpdateMomentum={handleUpdateMomentum}
          onCompleteMicroWin={handleCompleteMicroWin}
          onAddMicroWin={handleAddMicroWin}
          onUpdateMicroWin={handleUpdateMicroWin}
          onDeleteMicroWin={handleDeleteMicroWin}
          onReorderMicroWins={handleReorderMicroWins}
          onUpdateGoal={handleUpdateGoal}
          onMoveToParking={handleMoveToParking}
          onArchive={handleArchive}
          onAddGoal={openGoalCoach}
          onViewCoaching={handleViewCoaching}
        />
      </section>

      {/* Parking Lot - Collapsible */}
      {parkedGoals.length > 0 && (
        <section className="mb-8">
          <ParkingLot
            goals={parkedGoals}
            onActivate={handleActivate}
            onArchive={handleArchive}
            canActivate={activeGoals.length < 3}
            onGatekeeperNeeded={handleGatekeeperNeeded}
          />
        </section>
      )}

      {/* Empty state */}
      {activeGoals.length === 0 && parkedGoals.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#f1f5f9] flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
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
          <h2 className="text-xl font-semibold text-[#1e293b] mb-2">
            Start with one goal
          </h2>
          <p className="text-[#64748b] mb-4 max-w-md mx-auto text-sm">
            Focus on what matters most. The Rule of Three keeps you centered.
          </p>
          <button
            onClick={openGoalCoach}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6366f1] text-white hover:bg-[#4f46e5] transition-colors text-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
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

      {/* Goal Coach - New Goal */}
      <GoalCoach
        isOpen={showGoalCoach}
        onClose={closeGoalCoach}
        onGoalCreated={handleGoalCreated}
      />

      {/* Goal Coach - Continue Session */}
      <GoalCoach
        isOpen={viewingSession !== null}
        onClose={closeViewingSession}
        onGoalCreated={handleGoalCreated}
        existingSession={viewingSession || undefined}
        onGoalUpdated={refresh}
      />

      {/* Loading indicator for session fetch */}
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
        onClose={closeGatekeeper}
        activeGoals={activeGoals}
        incomingGoal={gatekeeperGoal}
        onSwap={handleSwap}
      />
    </div>
  )
}
