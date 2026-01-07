'use client'

import { useState, useEffect, useRef } from 'react'
import { useGoalCoaching, type ChatMessage, type GoalData } from '@/hooks/useGoalCoaching'
import type { CoachingStage } from '@/lib/ai/prompts/goal-coaching'

interface GoalCoachProps {
  isOpen: boolean
  onClose: () => void
  onGoalCreated: (goalData: GoalData) => void
}

const stageLabels: Record<CoachingStage, string> = {
  welcome: 'Getting started',
  goal_discovery: 'Discovering your goal',
  goal_refinement: 'Refining your goal',
  why_drilling: 'Finding your why',
  micro_win: 'Planning first step',
  confirmation: 'Ready to commit',
  complete: 'Goal created!'
}

export function GoalCoach({ isOpen, onClose, onGoalCreated }: GoalCoachProps) {
  const {
    messages,
    stage,
    goalData,
    isLoading,
    error,
    isComplete,
    sendMessage,
    startConversation,
    reset
  } = useGoalCoaching()

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasStartedRef = useRef(false)

  // Start conversation when opened (only once)
  useEffect(() => {
    if (isOpen && !hasStartedRef.current) {
      hasStartedRef.current = true
      startConversation()
    }
  }, [isOpen, startConversation])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input after loading
  useEffect(() => {
    if (!isLoading && isOpen) {
      inputRef.current?.focus()
    }
  }, [isLoading, isOpen])

  // Handle completion
  useEffect(() => {
    if (isComplete && goalData.title) {
      // Wait a moment for user to see the final message
      const timer = setTimeout(() => {
        onGoalCreated(goalData as GoalData)
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [isComplete, goalData, onGoalCreated])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const message = input.trim()
    setInput('')
    await sendMessage(message)
  }

  const handleClose = () => {
    reset()
    hasStartedRef.current = false
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Chat panel - slides in from right */}
      <div className="relative ml-auto w-full max-w-lg h-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-[#e2e8f0] bg-gradient-to-r from-[#6366f1] to-[#8b5cf6]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Goal Coach
              </h2>
              <p className="text-sm text-white/80">
                {stageLabels[stage]}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors p-1"
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

          {/* Progress indicator */}
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
        </div>

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
          {isComplete && (
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

        {/* Input */}
        {!isComplete && (
          <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t border-[#e2e8f0] bg-[#f8fafc]">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your response..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-[#e2e8f0] focus:border-[#6366f1] focus:outline-none transition-colors disabled:opacity-50 text-[#1e293b] placeholder:text-[#94a3b8]"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-3 rounded-xl bg-[#6366f1] text-white hover:bg-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          </form>
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

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-3 ${
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
  )
}

function getStageIndex(stage: CoachingStage): number {
  const stages: CoachingStage[] = ['welcome', 'goal_discovery', 'why_drilling', 'micro_win', 'confirmation', 'complete']
  return stages.indexOf(stage)
}
