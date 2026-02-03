'use client'

import { useGoalManagement } from '@/hooks/useGoalManagement'
import {
  ActiveTrio,
  ParkingLot,
  GatekeeperModal,
} from '@/components/goals'
import { PursuitCoach } from '@/components/pursuits'
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
    deepeningGoal,
    openGoalCoach,
    closeGoalCoach,
    closeViewingSession,
    closeGatekeeper,
    closeDeepeningCoach,
    handleGoalCreated,
    handleUpdateMomentum,
    handleCompleteMicroWin,
    handleAddMicroWin,
    handleUpdateMicroWin,
    handleDeleteMicroWin,
    handleReorderMicroWins,
    handleUpdateGoal,
    handleMoveToParking,
    handleArchive,
    handleGatekeeperNeeded,
    handleSwap,
    handleViewCoaching,
    handleDeepenPursuit,
    handlePursuitActivated,
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
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
          {error}
          <button
            onClick={refresh}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Active Pursuits - The Trio */}
      <section className="mb-8">
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
          onAddGoal={openGoalCoach}
          onDeepenPursuit={handleDeepenPursuit}
          onViewCoaching={handleViewCoaching}
        />
      </section>

      {/* Parking Lot - Collapsible */}
      {parkedGoals.length > 0 && (
        <section className="mb-8">
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
      )}

      {/* Empty state */}
      {activeGoals.length === 0 && parkedGoals.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-foreground/5 flex items-center justify-center">
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
              className="text-muted"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Start with one pursuit
          </h2>
          <p className="text-muted mb-4 max-w-md mx-auto text-sm">
            Focus on what matters most. The Rule of Three keeps you centered.
          </p>
          <button
            onClick={openGoalCoach}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity text-sm"
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
            Add your first pursuit
          </button>
        </div>
      )}

      {/* Pursuit Coach - New Pursuit */}
      <PursuitCoach
        isOpen={showGoalCoach}
        onClose={closeGoalCoach}
        onGoalCreated={handleGoalCreated}
      />

      {/* Pursuit Coach - Deepen & Activate */}
      <PursuitCoach
        isOpen={deepeningGoal !== null}
        onClose={closeDeepeningCoach}
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
        onClose={closeViewingSession}
        onGoalCreated={handleGoalCreated}
        existingSession={viewingSession || undefined}
        onGoalUpdated={refresh}
      />

      {/* Loading indicator for session fetch */}
      {loadingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-background rounded-xl p-6 shadow-xl border border-border">
            <Loading />
            <p className="mt-2 text-sm text-muted">Loading coaching history...</p>
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
