'use client'

import { useState, useEffect, useRef } from 'react'
import { useWhyDrilling } from '@/hooks/useGoals'

interface WhyDrillingChatProps {
  goalTitle: string
  isOpen: boolean
  onClose: () => void
  onComplete: (whyRoot: string) => void
}

export function WhyDrillingChat({
  goalTitle,
  isOpen,
  onClose,
  onComplete
}: WhyDrillingChatProps) {
  const {
    conversation,
    currentQuestion,
    isComplete,
    whyRoot,
    loading,
    drill,
    reset
  } = useWhyDrilling(goalTitle)

  const [input, setInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Start the conversation when opened
  useEffect(() => {
    if (isOpen && conversation.length === 0) {
      drill()
    }
  }, [isOpen, conversation.length, drill])

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  // Handle completion
  useEffect(() => {
    if (isComplete && whyRoot) {
      // Give user a moment to read the final message
      const timer = setTimeout(() => {
        onComplete(whyRoot)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isComplete, whyRoot, onComplete])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    drill(input.trim())
    setInput('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 gatekeeper-overlay flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#cbd5e1] bg-[#f8fafc]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#0f172a]">
                Let&apos;s find your &ldquo;why&rdquo;
              </h2>
              <p className="text-sm text-[#475569] mt-1 font-medium">
                {goalTitle}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-[#64748b] hover:text-[#334155] transition-colors"
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
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {conversation.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`drilling-bubble ${
                  msg.role === 'user' ? 'drilling-bubble-user' : ''
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="drilling-bubble">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#64748b] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#64748b] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#64748b] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Completion message */}
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
                Found your why!
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        {!isComplete && (
          <form onSubmit={handleSubmit} className="p-4 border-t border-[#cbd5e1] bg-[#f8fafc]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer..."
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-[#cbd5e1] focus:border-[#6366f1] focus:outline-none transition-colors disabled:opacity-50 text-[#1e293b] placeholder:text-[#64748b]"
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
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
    </div>
  )
}
