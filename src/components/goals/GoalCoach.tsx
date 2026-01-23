'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useGoalCoaching, type ChatMessage, type GoalData } from '@/hooks/useGoalCoaching'
import type { CoachingStage } from '@/lib/ai/prompts/goal-coaching'
import type { CoachingSession } from '@/types/goal'

interface GoalCoachProps {
  isOpen: boolean
  onClose: () => void
  onMinimize?: () => void // Called when user clicks outside or minimize button
  isMinimized?: boolean
  onGoalCreated: (goalData: GoalData, sessionId: string | null) => void
  existingSession?: CoachingSession
  viewOnly?: boolean
  onGoalUpdated?: () => void // Called when an existing goal is updated via coaching
}

const stageLabels: Record<CoachingStage, string> = {
  welcome: 'Getting started',
  goal_discovery: 'Discovering your goal',
  why_drilling: 'Finding your why',
  micro_win: 'Planning first step',
  confirmation: 'Ready to commit',
  complete: 'Goal created!',
  continuation: 'Updating your goal'
}

export function GoalCoach({ isOpen, onClose, onMinimize, isMinimized = false, onGoalCreated, existingSession, viewOnly = false, onGoalUpdated }: GoalCoachProps) {
  const {
    messages,
    stage,
    goalData,
    isLoading,
    error,
    isComplete,
    sessionId,
    sendMessage,
    startConversation,
    reset
  } = useGoalCoaching({ existingSession })

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasStartedRef = useRef(false)

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [])

  // Start conversation when opened (only once, and not for existing sessions)
  useEffect(() => {
    if (isOpen && !hasStartedRef.current && !existingSession) {
      hasStartedRef.current = true
      startConversation()
    }
  }, [isOpen, startConversation, existingSession])

  // Mark as started if we have an existing session
  useEffect(() => {
    if (existingSession) {
      hasStartedRef.current = true
    }
  }, [existingSession])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input after loading
  useEffect(() => {
    if (!isLoading && isOpen && !viewOnly) {
      textareaRef.current?.focus()
    }
  }, [isLoading, isOpen, viewOnly])

  // Handle completion
  useEffect(() => {
    if (isComplete && goalData.title && !viewOnly) {
      // Wait a moment for user to see the final message
      const timer = setTimeout(() => {
        onGoalCreated(goalData as GoalData, sessionId)
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [isComplete, goalData, onGoalCreated, sessionId, viewOnly])

  // Notify parent when goal is updated via continuation
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.updateInfo && onGoalUpdated) {
      onGoalUpdated()
    }
  }, [messages, onGoalUpdated])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || viewOnly) return

    const message = input.trim()
    setInput('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    await sendMessage(message)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleClose = () => {
    reset()
    hasStartedRef.current = false
    onClose()
  }

  if (!isOpen) return null

  // Handle clicking outside - minimize instead of close
  const handleBackdropClick = () => {
    if (onMinimize) {
      onMinimize()
    }
  }

  return (
    <div className={`fixed z-50 ${isMinimized ? 'bottom-6 right-6' : 'inset-0'} flex`}>
      {/* Backdrop - only show when expanded, no blur */}
      {!isMinimized && (
        <div
          className="absolute inset-0 bg-black/20"
          onClick={handleBackdropClick}
        />
      )}

      {/* Chat panel - slides in from right when expanded, small card when minimized */}
      <div className={`relative ${isMinimized
        ? 'w-80 h-auto max-h-16 rounded-2xl cursor-pointer'
        : 'ml-auto w-full max-w-lg h-dvh'} bg-white shadow-2xl flex flex-col ${!isMinimized ? 'animate-slide-in-right' : ''}`}
        onClick={isMinimized ? onMinimize : undefined}
      >
        {/* Header */}
        <div className={`flex-shrink-0 ${isMinimized ? 'p-3 rounded-2xl' : 'p-4 border-b border-[#e2e8f0]'} bg-gradient-to-r from-[#6366f1] to-[#8b5cf6]`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Whistle icon when minimized */}
              {isMinimized && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <ellipse cx="14" cy="14" rx="7" ry="5" />
                  <path d="M7 14H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h3" />
                  <circle cx="3" cy="8" r="2" />
                </svg>
              )}
              <div>
                <h2 className={`${isMinimized ? 'text-sm' : 'text-lg'} font-bold text-white`}>
                  {existingSession ? 'Continue Coaching' : 'Goal Coach'}
                </h2>
                {!isMinimized && (
                  <p className="text-sm text-white/80">
                    {stageLabels[stage]}
                  </p>
                )}
              </div>
            </div>
            {!isMinimized && (
              <div className="flex items-center gap-1">
                {/* Minimize button */}
                {onMinimize && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMinimize() }}
                    className="text-white/80 hover:text-white transition-colors p-1"
                    title="Minimize"
                  >
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
                      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                    </svg>
                  </button>
                )}
                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="text-white/80 hover:text-white transition-colors p-1"
                  title="Close"
                >
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
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Progress indicator - only when expanded */}
          {!isMinimized && (
            <div className="mt-3 flex gap-1">
              {(['welcome', 'goal_discovery', 'why_drilling', 'micro_win', 'confirmation'] as CoachingStage[]).map((s, i) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    getStageIndex(stage) >= i
                      ? 'bg-white'
                      : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content - hide when minimized */}
        {!isMinimized && (
          <>
        {/* Goal summary card (shows as goal takes shape) */}
        {goalData.title && (
          <div className="flex-shrink-0 mx-4 mt-4 p-3 rounded-xl bg-[#f0fdf4] border border-[#86efac]">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-[#10b981] flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#15803d] text-sm">
                  {goalData.title}
                </p>
                {goalData.whyRoot && (
                  <p className="text-xs text-[#166534] mt-1 italic">
                    &ldquo;{goalData.whyRoot}&rdquo;
                  </p>
                )}
                {goalData.microWin && (
                  <p className="text-xs text-[#166534] mt-1 flex items-center gap-1">
                    <span className="font-medium">First step:</span> {goalData.microWin}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#f1f5f9] text-[#1e293b] rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%]">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#64748b] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#64748b] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#64748b] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="text-center">
              <p className="text-sm text-[#dc2626] bg-[#fef2f2] px-3 py-2 rounded-lg inline-block">
                {error}
              </p>
            </div>
          )}

          {/* Completion celebration */}
          {isComplete && !viewOnly && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#dcfce7] text-[#15803d] text-sm font-semibold border border-[#86efac]">
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
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Creating your goal...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input - auto-growing textarea */}
        {/* Show input: 1) when not complete, OR 2) when continuing an existing session */}
        {(!isComplete || existingSession) && !viewOnly && (
          <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-[#e2e8f0] bg-[#f8fafc]">
            {/* Hint for continuing existing sessions */}
            {existingSession && isComplete && (
              <div className="px-4 py-2 bg-[#f0fdf4] border-b border-[#86efac]">
                <p className="text-xs text-[#15803d] text-center">
                  Update your goal: change steps, motivation, or ask for coaching advice
                </p>
              </div>
            )}
            <div className="flex gap-2 items-end p-4">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  adjustTextareaHeight()
                }}
                onKeyDown={handleKeyDown}
                placeholder={existingSession && isComplete
                  ? "Update your motivation, add a new step, or ask for advice..."
                  : "Type your response..."}
                disabled={isLoading}
                rows={1}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-[#e2e8f0] focus:border-[#6366f1] focus:outline-none transition-colors disabled:opacity-50 text-[#1e293b] placeholder:text-[#94a3b8] resize-none overflow-hidden min-h-[48px] max-h-[150px]"
                style={{ height: 'auto' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-3 rounded-xl bg-[#6366f1] text-white hover:bg-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 h-[48px]"
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
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-[#94a3b8] px-4 pb-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </form>
        )}


        {/* View-only footer */}
        {viewOnly && (
          <div className="flex-shrink-0 p-4 border-t border-[#e2e8f0] bg-[#f8fafc]">
            <p className="text-sm text-[#64748b] text-center">
              This is a past coaching session
            </p>
          </div>
        )}
          </>
        )}
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  // Labels for update types
  const updateLabels: Record<string, string> = {
    goal: 'Goal updated',
    why: 'Motivation updated',
    step: 'Next step updated',
    notes: 'Notes updated'
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[80%]">
        {/* Update indicator */}
        {message.updateInfo && (
          <div className="mb-1.5 flex items-center gap-1.5 text-xs text-[#10b981]">
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
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span className="font-medium">{updateLabels[message.updateInfo.type]}</span>
          </div>
        )}
        <div
          className={`px-4 py-3 ${
            isUser
              ? 'bg-[#6366f1] text-white rounded-2xl rounded-br-md'
              : 'bg-[#f1f5f9] text-[#1e293b] rounded-2xl rounded-bl-md'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  )
}

function getStageIndex(stage: CoachingStage): number {
  const stages: CoachingStage[] = ['welcome', 'goal_discovery', 'why_drilling', 'micro_win', 'confirmation', 'complete']
  return stages.indexOf(stage)
}
