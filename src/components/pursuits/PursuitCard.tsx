'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { GoalWithMicroWins } from '@/types/goal'
import { MomentumSlider } from './MomentumSlider'
import { ProgressRing } from './ProgressRing'

interface PursuitCardProps {
  goal: GoalWithMicroWins
  onUpdateMomentum: (momentum: number) => Promise<void>
  onCompleteMicroWin: (microWinId: string) => Promise<void>
  onAddMicroWin?: (description: string) => Promise<void>
  onUpdateMicroWin?: (microWinId: string, description: string) => Promise<void>
  onDeleteMicroWin?: (microWinId: string) => Promise<void>
  onReorderMicroWins?: (orderedIds: string[]) => Promise<void>
  onUpdateGoal?: (updates: { title?: string; why_root?: string; notes?: string }) => Promise<void>
  onMoveToParking?: () => Promise<void>
  onArchive?: () => Promise<void>
  onViewCoaching?: () => void
  compact?: boolean
}

export function PursuitCard({
  goal,
  onUpdateMomentum,
  onCompleteMicroWin,
  onAddMicroWin,
  onUpdateMicroWin,
  onDeleteMicroWin,
  onReorderMicroWins,
  onUpdateGoal,
  onMoveToParking,
  onArchive,
  onViewCoaching,
  compact = false
}: PursuitCardProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(goal.title)
  const [editWhy, setEditWhy] = useState(goal.why_root || '')
  const [editNotes, setEditNotes] = useState(goal.notes || '')
  const [newMicroWin, setNewMicroWin] = useState('')
  const [showMicroWinInput, setShowMicroWinInput] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showFullWhy, setShowFullWhy] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showAllSteps, setShowAllSteps] = useState(false)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [editStepText, setEditStepText] = useState('')
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize notes textarea
  const adjustNotesHeight = useCallback(() => {
    const textarea = notesRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [])

  // Adjust height when notes change
  useEffect(() => {
    if (showNotes) {
      adjustNotesHeight()
    }
  }, [showNotes, editNotes, adjustNotesHeight])

  // Calculate progress based on micro-wins
  const totalMicroWins = goal.micro_wins?.length || 0
  const completedMicroWins = goal.micro_wins?.filter(mw => mw.completed_at)?.length || 0
  const progress = totalMicroWins > 0 ? (completedMicroWins / totalMicroWins) * 100 : 0

  const handleCompleteMicroWin = async () => {
    if (!goal.current_micro_win || isCompleting) return

    setIsCompleting(true)
    setShowCelebration(true)

    // Wait for celebration animation
    await new Promise(resolve => setTimeout(resolve, 300))

    await onCompleteMicroWin(goal.current_micro_win.id)

    setShowCelebration(false)
    setIsCompleting(false)
  }

  const handleSaveEdit = async () => {
    if (!onUpdateGoal || isSaving) return

    setIsSaving(true)
    await onUpdateGoal({
      title: editTitle,
      why_root: editWhy || undefined,
      notes: editNotes || undefined
    })
    setIsEditing(false)
    setIsSaving(false)
  }

  const handleCancelEdit = () => {
    setEditTitle(goal.title)
    setEditWhy(goal.why_root || '')
    setEditNotes(goal.notes || '')
    setIsEditing(false)
  }

  const handleSaveNotes = async () => {
    if (!onUpdateGoal || isSaving) return

    setIsSaving(true)
    await onUpdateGoal({ notes: editNotes || undefined })
    setIsSaving(false)
  }

  const handleAddMicroWin = async () => {
    if (!onAddMicroWin || !newMicroWin.trim() || isSaving) return

    setIsSaving(true)
    await onAddMicroWin(newMicroWin.trim())
    setNewMicroWin('')
    setShowMicroWinInput(false)
    setIsSaving(false)
  }

  const handleStartEditStep = (stepId: string, currentText: string) => {
    setEditingStepId(stepId)
    setEditStepText(currentText)
  }

  const handleSaveStepEdit = async () => {
    if (!onUpdateMicroWin || !editingStepId || !editStepText.trim() || isSaving) return

    setIsSaving(true)
    await onUpdateMicroWin(editingStepId, editStepText.trim())
    setEditingStepId(null)
    setEditStepText('')
    setIsSaving(false)
  }

  const handleCancelStepEdit = () => {
    setEditingStepId(null)
    setEditStepText('')
  }

  const handleDeleteStep = async (stepId: string) => {
    if (!onDeleteMicroWin || isSaving) return
    if (!confirm('Delete this step?')) return

    setIsSaving(true)
    await onDeleteMicroWin(stepId)
    setIsSaving(false)
  }

  const handleDragStart = (stepId: string) => {
    setDraggedStepId(stepId)
  }

  const handleDragOver = (e: React.DragEvent, targetStepId: string) => {
    e.preventDefault()
    if (!draggedStepId || draggedStepId === targetStepId) return

    const allSteps = [...(goal.micro_wins || [])]
    const draggedIndex = allSteps.findIndex(s => s.id === draggedStepId)
    const targetIndex = allSteps.findIndex(s => s.id === targetStepId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Reorder locally for visual feedback
    const [removed] = allSteps.splice(draggedIndex, 1)
    allSteps.splice(targetIndex, 0, removed)
  }

  const handleDragEnd = async () => {
    if (!draggedStepId || !onReorderMicroWins) {
      setDraggedStepId(null)
      return
    }

    const allSteps = [...(goal.micro_wins || [])]
    const draggedIndex = allSteps.findIndex(s => s.id === draggedStepId)

    if (draggedIndex === -1) {
      setDraggedStepId(null)
      return
    }

    // Get ordered IDs
    const orderedIds = allSteps.map(s => s.id)

    setIsSaving(true)
    await onReorderMicroWins(orderedIds)
    setDraggedStepId(null)
    setIsSaving(false)
  }

  return (
    <div
      className="goal-card relative bg-background border border-border"
      data-momentum={goal.momentum}
    >
      {/* Edit Mode */}
      {isEditing ? (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Goal</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 border-border focus:border-foreground focus:outline-none text-foreground bg-background"
              placeholder="What do you want to achieve?"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Why (motivation)</label>
            <textarea
              value={editWhy}
              onChange={(e) => setEditWhy(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 border-border focus:border-foreground focus:outline-none text-foreground bg-background resize-none min-h-[60px]"
              placeholder="Why is this important to you?"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Notes (longer-term plans)</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 border-border focus:border-foreground focus:outline-none text-foreground bg-background resize-none min-h-[80px]"
              placeholder="Capture your medium-long term plans, milestones, or reflections..."
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={isSaving || !editTitle.trim()}
              className="flex-1 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-3 py-2 rounded-lg border border-border text-muted text-sm hover:bg-foreground/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Why Badge - click to expand */}
          {goal.why_root && (
            <button
              onClick={() => setShowFullWhy(!showFullWhy)}
              className="why-badge mb-3 text-left w-full cursor-pointer hover:opacity-80 transition-opacity"
              title={showFullWhy ? 'Click to collapse' : 'Click to expand'}
            >
              {showFullWhy || goal.why_root.length <= 80
                ? goal.why_root
                : `${goal.why_root.substring(0, 80)}...`}
            </button>
          )}

          {/* Goal Title with Edit Button */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="text-lg font-semibold text-foreground break-words">
              {goal.title}
            </h3>
            {onUpdateGoal && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-muted hover:text-foreground transition-colors p-1 -mt-1 -mr-1 flex-shrink-0"
                title="Edit goal"
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
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
              </button>
            )}
          </div>
        </>
      )}

      {/* Current Micro-Win (The NOW task) */}
      {goal.current_micro_win && (
        <div className="flex items-start gap-3 mb-4">
          <button
            onClick={handleCompleteMicroWin}
            disabled={isCompleting}
            className="relative"
          >
            <input
              type="checkbox"
              className="micro-win-checkbox"
              checked={false}
              readOnly
            />
            {showCelebration && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="micro-win-celebration w-6 h-6 rounded-full bg-green-500" />
              </div>
            )}
          </button>
          <p className="text-foreground/80 text-base leading-relaxed flex-1">
            {goal.current_micro_win.description}
          </p>
        </div>
      )}

      {/* No micro-wins message */}
      {!goal.current_micro_win && totalMicroWins === 0 && !showMicroWinInput && (
        <div className="mb-4">
          {onAddMicroWin ? (
            <button
              onClick={() => setShowMicroWinInput(true)}
              className="flex items-center gap-2 text-foreground/70 hover:text-foreground text-sm font-medium transition-colors"
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
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Add your first small step
            </button>
          ) : (
            <p className="text-muted text-sm italic">
              Add your first small step to get started
            </p>
          )}
        </div>
      )}

      {/* All micro-wins completed */}
      {!goal.current_micro_win && totalMicroWins > 0 && completedMicroWins === totalMicroWins && !showMicroWinInput && (
        <div className="mb-4">
          {onAddMicroWin ? (
            <button
              onClick={() => setShowMicroWinInput(true)}
              className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:opacity-80 text-sm font-medium transition-opacity"
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
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Add next step
            </button>
          ) : (
            <p className="text-green-600 dark:text-green-400 text-sm font-medium">
              All steps completed!
            </p>
          )}
        </div>
      )}

      {/* Add micro-win input */}
      {showMicroWinInput && onAddMicroWin && (
        <div className="mb-4 space-y-2">
          <input
            type="text"
            value={newMicroWin}
            onChange={(e) => setNewMicroWin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newMicroWin.trim()) {
                handleAddMicroWin()
              } else if (e.key === 'Escape') {
                setShowMicroWinInput(false)
                setNewMicroWin('')
              }
            }}
            placeholder="What's the smallest next step?"
            className="w-full px-3 py-2 rounded-lg border-2 border-border focus:border-foreground focus:outline-none text-foreground bg-background text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddMicroWin}
              disabled={isSaving || !newMicroWin.trim()}
              className="flex-1 px-3 py-1.5 rounded-lg bg-foreground text-background text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSaving ? 'Adding...' : 'Add step'}
            </button>
            <button
              onClick={() => {
                setShowMicroWinInput(false)
                setNewMicroWin('')
              }}
              className="px-3 py-1.5 rounded-lg border border-border text-muted text-sm hover:bg-foreground/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* All Steps List - Expandable */}
      {totalMicroWins > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowAllSteps(!showAllSteps)}
            className="flex items-center gap-2 text-xs text-foreground/70 hover:text-foreground font-medium transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${showAllSteps ? 'rotate-90' : ''}`}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
            {showAllSteps ? 'Hide' : 'View'} all {totalMicroWins} step{totalMicroWins !== 1 ? 's' : ''}
          </button>

          {showAllSteps && (
            <div className="mt-3 space-y-2">
              {goal.micro_wins?.map((step) => (
                <div
                  key={step.id}
                  draggable={onReorderMicroWins && editingStepId !== step.id}
                  onDragStart={() => handleDragStart(step.id)}
                  onDragOver={(e) => handleDragOver(e, step.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-start gap-2 p-2 rounded-lg border ${
                    step.is_current
                      ? 'border-foreground/30 bg-foreground/5'
                      : 'border-border bg-background'
                  } ${draggedStepId === step.id ? 'opacity-50' : ''}`}
                >
                  {/* Drag Handle */}
                  {onReorderMicroWins && editingStepId !== step.id && (
                    <div className="cursor-move text-muted mt-1">
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
                        <circle cx="9" cy="5" r="1" />
                        <circle cx="9" cy="12" r="1" />
                        <circle cx="9" cy="19" r="1" />
                        <circle cx="15" cy="5" r="1" />
                        <circle cx="15" cy="12" r="1" />
                        <circle cx="15" cy="19" r="1" />
                      </svg>
                    </div>
                  )}

                  {/* Checkbox */}
                  <button
                    onClick={() => !step.completed_at && onCompleteMicroWin(step.id)}
                    disabled={!!step.completed_at}
                    className="mt-1"
                  >
                    <input
                      type="checkbox"
                      className="micro-win-checkbox"
                      checked={!!step.completed_at}
                      readOnly
                    />
                  </button>

                  {/* Description or Edit Input */}
                  <div className="flex-1 min-w-0">
                    {editingStepId === step.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editStepText}
                          onChange={(e) => setEditStepText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editStepText.trim()) {
                              handleSaveStepEdit()
                            } else if (e.key === 'Escape') {
                              handleCancelStepEdit()
                            }
                          }}
                          className="w-full px-2 py-1 rounded border-2 border-foreground focus:outline-none text-sm bg-background text-foreground"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveStepEdit}
                            disabled={isSaving || !editStepText.trim()}
                            className="px-2 py-1 rounded bg-foreground text-background text-xs hover:opacity-90 disabled:opacity-50 transition-opacity"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelStepEdit}
                            className="px-2 py-1 rounded border border-border text-muted text-xs hover:bg-foreground/5 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className={`text-sm ${
                          step.completed_at
                            ? 'line-through text-muted'
                            : 'text-foreground/80'
                        }`}
                      >
                        {step.description}
                        {step.is_current && (
                          <span className="ml-2 text-xs text-foreground/60 font-medium">
                            (current)
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Edit and Delete Buttons */}
                  {editingStepId !== step.id && (
                    <div className="flex gap-1">
                      {onUpdateMicroWin && (
                        <button
                          onClick={() => handleStartEditStep(step.id, step.description)}
                          className="text-muted hover:text-foreground transition-colors p-1"
                          title="Edit step"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </button>
                      )}
                      {onDeleteMicroWin && (
                        <button
                          onClick={() => handleDeleteStep(step.id)}
                          className="text-muted hover:text-red-500 transition-colors p-1"
                          title="Delete step"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
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
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!compact && (
        <>
          {/* Progress Ring */}
          {totalMicroWins > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <ProgressRing progress={progress} size={36} strokeWidth={3} />
              <span className="text-sm text-muted">
                {completedMicroWins} of {totalMicroWins} steps
              </span>
            </div>
          )}

          {/* Momentum Slider */}
          <div className="mb-4">
            <MomentumSlider
              value={goal.momentum}
              onChange={onUpdateMomentum}
            />
          </div>

          {/* Notes Section - Expandable */}
          {showNotes && onUpdateGoal && (
            <div className="mb-4 p-3 rounded-lg bg-foreground/5 border border-border">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted">Notes & Plans</label>
                <button
                  onClick={() => setShowNotes(false)}
                  className="text-muted hover:text-foreground transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m18 15-6-6-6 6"/>
                  </svg>
                </button>
              </div>
              <textarea
                ref={notesRef}
                value={editNotes}
                onChange={(e) => {
                  setEditNotes(e.target.value)
                  adjustNotesHeight()
                }}
                onBlur={handleSaveNotes}
                className="w-full px-3 py-2 rounded-lg border border-border focus:border-foreground focus:outline-none text-foreground bg-background text-sm resize-none min-h-[60px] max-h-[200px]"
                placeholder="Capture your medium-long term plans, milestones, or reflections..."
                rows={3}
              />
              <p className="text-xs text-muted mt-1">Auto-saves when you click away</p>
            </div>
          )}

          {/* Show notes preview if they exist and panel is closed */}
          {!showNotes && goal.notes && (
            <button
              onClick={() => setShowNotes(true)}
              className="mb-4 p-2 rounded-lg bg-foreground/5 border border-border w-full text-left hover:bg-foreground/10 transition-colors"
            >
              <p className="text-xs text-muted line-clamp-2">
                {goal.notes.length > 100 ? `${goal.notes.substring(0, 100)}...` : goal.notes}
              </p>
            </button>
          )}

          {/* Actions */}
          <div className="flex items-center flex-wrap gap-3 pt-3 border-t border-border">
            {onViewCoaching && (
              <button
                onClick={onViewCoaching}
                className="flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground font-medium transition-colors"
                title="Continue coaching conversation"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Coaching
              </button>
            )}
            {onUpdateGoal && !showNotes && (
              <button
                onClick={() => setShowNotes(true)}
                className="flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground font-medium transition-colors"
                title="Add notes and plans"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" x2="8" y1="13" y2="13" />
                  <line x1="16" x2="8" y1="17" y2="17" />
                </svg>
                Notes
              </button>
            )}
            {onAddMicroWin && !showMicroWinInput && goal.current_micro_win && (
              <button
                onClick={() => setShowMicroWinInput(true)}
                className="flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground font-medium transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
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
                Add step
              </button>
            )}
            {onMoveToParking && (
              <button
                onClick={onMoveToParking}
                className="flex items-center gap-1 text-xs text-muted hover:text-foreground font-medium transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                </svg>
                Park
              </button>
            )}
            {onArchive && (
              <button
                onClick={onArchive}
                className="flex items-center gap-1 text-xs text-muted hover:text-red-500 transition-colors ml-auto"
                title="Archive goal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
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
                Archive
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
