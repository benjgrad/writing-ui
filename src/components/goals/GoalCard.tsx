'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { GoalWithMicroWins } from '@/types/goal'
import { MomentumSlider } from './MomentumSlider'
import { ProgressRing } from './ProgressRing'

interface GoalCardProps {
  goal: GoalWithMicroWins
  onUpdateMomentum: (momentum: number) => Promise<void>
  onCompleteMicroWin: (microWinId: string) => Promise<void>
  onAddMicroWin?: (description: string) => Promise<void>
  onUpdateGoal?: (updates: { title?: string; why_root?: string; notes?: string }) => Promise<void>
  onMoveToParking?: () => Promise<void>
  onArchive?: () => Promise<void>
  onViewCoaching?: () => void
  compact?: boolean
}

export function GoalCard({
  goal,
  onUpdateMomentum,
  onCompleteMicroWin,
  onAddMicroWin,
  onUpdateGoal,
  onMoveToParking,
  onArchive,
  onViewCoaching,
  compact = false
}: GoalCardProps) {
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

  return (
    <div
      className="goal-card relative"
      data-momentum={goal.momentum}
    >
      {/* Edit Mode */}
      {isEditing ? (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1">Goal</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 border-[#cbd5e1] focus:border-[#6366f1] focus:outline-none text-[#1e293b]"
              placeholder="What do you want to achieve?"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1">Why (motivation)</label>
            <textarea
              value={editWhy}
              onChange={(e) => setEditWhy(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 border-[#cbd5e1] focus:border-[#6366f1] focus:outline-none text-[#1e293b] resize-none min-h-[60px]"
              placeholder="Why is this important to you?"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1">Notes (longer-term plans)</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 border-[#cbd5e1] focus:border-[#6366f1] focus:outline-none text-[#1e293b] resize-none min-h-[80px]"
              placeholder="Capture your medium-long term plans, milestones, or reflections..."
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={isSaving || !editTitle.trim()}
              className="flex-1 px-3 py-2 rounded-lg bg-[#6366f1] text-white text-sm font-medium hover:bg-[#4f46e5] disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-3 py-2 rounded-lg border border-[#cbd5e1] text-[#64748b] text-sm hover:bg-[#f1f5f9] transition-colors"
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
              className="why-badge mb-3 text-left w-full cursor-pointer hover:bg-[#dcfce7] transition-colors"
              title={showFullWhy ? 'Click to collapse' : 'Click to expand'}
            >
              {showFullWhy || goal.why_root.length <= 80
                ? goal.why_root
                : `${goal.why_root.substring(0, 80)}...`}
            </button>
          )}

          {/* Goal Title with Edit Button */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="text-lg font-semibold text-[#1e293b] break-words">
              {goal.title}
            </h3>
            {onUpdateGoal && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-[#94a3b8] hover:text-[#64748b] transition-colors p-1 -mt-1 -mr-1 flex-shrink-0"
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
                <div className="micro-win-celebration w-6 h-6 rounded-full bg-[#10b981]" />
              </div>
            )}
          </button>
          <p className="text-[#374151] text-base leading-relaxed flex-1">
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
              className="flex items-center gap-2 text-[#6366f1] hover:text-[#4f46e5] text-sm font-medium transition-colors"
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
            <p className="text-[#94a3b8] text-sm italic">
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
              className="flex items-center gap-2 text-[#10b981] hover:text-[#059669] text-sm font-medium transition-colors"
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
            <p className="text-[#10b981] text-sm font-medium">
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
            className="w-full px-3 py-2 rounded-lg border-2 border-[#cbd5e1] focus:border-[#6366f1] focus:outline-none text-[#1e293b] text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddMicroWin}
              disabled={isSaving || !newMicroWin.trim()}
              className="flex-1 px-3 py-1.5 rounded-lg bg-[#6366f1] text-white text-sm hover:bg-[#4f46e5] disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Adding...' : 'Add step'}
            </button>
            <button
              onClick={() => {
                setShowMicroWinInput(false)
                setNewMicroWin('')
              }}
              className="px-3 py-1.5 rounded-lg border border-[#cbd5e1] text-[#64748b] text-sm hover:bg-[#f1f5f9] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!compact && (
        <>
          {/* Progress Ring */}
          {totalMicroWins > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <ProgressRing progress={progress} size={36} strokeWidth={3} />
              <span className="text-sm text-[#64748b]">
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
            <div className="mb-4 p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[#64748b]">Notes & Plans</label>
                <button
                  onClick={() => setShowNotes(false)}
                  className="text-[#94a3b8] hover:text-[#64748b] transition-colors"
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
                className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] focus:border-[#6366f1] focus:outline-none text-[#1e293b] text-sm resize-none min-h-[60px] max-h-[200px]"
                placeholder="Capture your medium-long term plans, milestones, or reflections..."
                rows={3}
              />
              <p className="text-xs text-[#94a3b8] mt-1">Auto-saves when you click away</p>
            </div>
          )}

          {/* Show notes preview if they exist and panel is closed */}
          {!showNotes && goal.notes && (
            <button
              onClick={() => setShowNotes(true)}
              className="mb-4 p-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] w-full text-left hover:bg-[#f1f5f9] transition-colors"
            >
              <p className="text-xs text-[#64748b] line-clamp-2">
                {goal.notes.length > 100 ? `${goal.notes.substring(0, 100)}...` : goal.notes}
              </p>
            </button>
          )}

          {/* Actions */}
          <div className="flex items-center flex-wrap gap-3 pt-3 border-t border-[#e2e8f0]">
            {onViewCoaching && (
              <button
                onClick={onViewCoaching}
                className="flex items-center gap-1 text-xs text-[#6366f1] hover:text-[#4f46e5] font-medium transition-colors"
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
                className="flex items-center gap-1 text-xs text-[#6366f1] hover:text-[#4f46e5] font-medium transition-colors"
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
                className="flex items-center gap-1 text-xs text-[#6366f1] hover:text-[#4f46e5] font-medium transition-colors"
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
                className="flex items-center gap-1 text-xs text-[#64748b] hover:text-[#1e293b] font-medium transition-colors"
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
                className="flex items-center gap-1 text-xs text-[#94a3b8] hover:text-[#ef4444] transition-colors ml-auto"
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
