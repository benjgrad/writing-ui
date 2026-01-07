'use client'

import { useState, useCallback, useRef } from 'react'
import {
  type CoachingStage,
  type CoachingContext,
  getNextStage
} from '@/lib/ai/prompts/goal-coaching'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface GoalData {
  title: string
  whyRoot?: string
  microWin?: string
}

export function useGoalCoaching() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [stage, setStage] = useState<CoachingStage>('welcome')
  const [goalData, setGoalData] = useState<Partial<GoalData>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  // Use refs to avoid dependency cycles
  const messagesRef = useRef<ChatMessage[]>([])
  const stageRef = useRef<CoachingStage>('welcome')
  const goalDataRef = useRef<Partial<GoalData>>({})
  const isStartedRef = useRef(false)

  // Keep refs in sync
  messagesRef.current = messages
  stageRef.current = stage
  goalDataRef.current = goalData

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  const sendMessage = useCallback(async (userMessage?: string) => {
    setIsLoading(true)
    setError(null)

    // Build context from refs to avoid stale closures
    const currentMessages = messagesRef.current
    const currentStage = stageRef.current
    const currentGoalData = goalDataRef.current

    // Add user message to chat if provided
    let updatedMessages = [...currentMessages]
    if (userMessage) {
      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      }
      updatedMessages = [...currentMessages, userMsg]
      setMessages(updatedMessages)
    }

    try {
      const context: CoachingContext = {
        stage: currentStage,
        goalTitle: currentGoalData.title,
        whyRoot: currentGoalData.whyRoot,
        microWin: currentGoalData.microWin,
        conversationHistory: updatedMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      }

      const response = await fetch('/api/ai/coach-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          userMessage
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      // Add assistant message
      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMsg])

      // Update goal data if captured
      const newGoalData = { ...currentGoalData }
      let dataUpdated = false

      if (data.goalTitle) {
        newGoalData.title = data.goalTitle
        dataUpdated = true
      }
      if (data.whyRoot) {
        newGoalData.whyRoot = data.whyRoot
        dataUpdated = true
      }
      if (data.microWin) {
        newGoalData.microWin = data.microWin
        dataUpdated = true
      }

      if (dataUpdated) {
        setGoalData(newGoalData)
      }

      // Advance stage if data was captured
      if (dataUpdated || data.isComplete) {
        const updatedContext: CoachingContext = {
          ...context,
          goalTitle: newGoalData.title,
          whyRoot: newGoalData.whyRoot,
          microWin: newGoalData.microWin
        }
        const nextStage = getNextStage(currentStage, updatedContext)
        setStage(nextStage)
      }

      // Check for completion
      if (data.isComplete) {
        setIsComplete(true)
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, []) // No dependencies - uses refs

  const startConversation = useCallback(async () => {
    // Prevent multiple starts
    if (isStartedRef.current) return
    isStartedRef.current = true

    setMessages([])
    setStage('welcome')
    setGoalData({})
    setIsComplete(false)
    setError(null)

    // Reset refs
    messagesRef.current = []
    stageRef.current = 'welcome'
    goalDataRef.current = {}

    // Send initial message to get the welcome
    try {
      await sendMessage()
    } catch {
      // Error is already set in sendMessage
    }
  }, [sendMessage])

  const reset = useCallback(() => {
    setMessages([])
    setStage('welcome')
    setGoalData({})
    setIsLoading(false)
    setError(null)
    setIsComplete(false)
    isStartedRef.current = false
    messagesRef.current = []
    stageRef.current = 'welcome'
    goalDataRef.current = {}
  }, [])

  return {
    messages,
    stage,
    goalData,
    isLoading,
    error,
    isComplete,
    sendMessage,
    startConversation,
    reset
  }
}
