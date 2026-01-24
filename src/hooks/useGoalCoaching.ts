'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  type CoachingStage,
  type CoachingContext,
  getNextStage
} from '@/lib/ai/prompts/goal-coaching'
import type { CoachingSession, CoachingMessage } from '@/types/goal'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  updateInfo?: {
    type: 'goal' | 'why' | 'step' | 'notes'
    value: string
  }
}

export interface GoalData {
  title: string
  whyRoot?: string
  microWin?: string
  notes?: string
}

interface UseGoalCoachingOptions {
  existingSession?: CoachingSession
}

export function useGoalCoaching(options: UseGoalCoachingOptions = {}) {
  const { existingSession } = options

  // Initialize from existing session if provided
  const initialMessages: ChatMessage[] = existingSession?.messages?.map((m: CoachingMessage) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.created_at)
  })) || []

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [stage, setStage] = useState<CoachingStage>(existingSession?.stage as CoachingStage || 'welcome')
  const [goalData, setGoalData] = useState<Partial<GoalData>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(existingSession?.stage === 'complete')
  const [sessionId, setSessionId] = useState<string | null>(existingSession?.id || null)

  // Use refs to avoid dependency cycles
  const messagesRef = useRef<ChatMessage[]>(initialMessages)
  const stageRef = useRef<CoachingStage>(existingSession?.stage as CoachingStage || 'welcome')
  const goalDataRef = useRef<Partial<GoalData>>({})
  const isStartedRef = useRef(!!existingSession)
  const sessionIdRef = useRef<string | null>(existingSession?.id || null)
  const isCompleteRef = useRef(existingSession?.stage === 'complete')

  // Sync state when existingSession changes (for viewing past sessions)
  useEffect(() => {
    if (existingSession) {
      const sessionMessages: ChatMessage[] = existingSession.messages?.map((m: CoachingMessage) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at)
      })) || []

      setMessages(sessionMessages)
      setStage(existingSession.stage as CoachingStage)
      setIsComplete(existingSession.stage === 'complete')
      setSessionId(existingSession.id)
      isStartedRef.current = true
      messagesRef.current = sessionMessages
      stageRef.current = existingSession.stage as CoachingStage
      sessionIdRef.current = existingSession.id
      isCompleteRef.current = existingSession.stage === 'complete'
    }
  }, [existingSession])

  // Keep refs in sync
  messagesRef.current = messages
  stageRef.current = stage
  goalDataRef.current = goalData
  sessionIdRef.current = sessionId

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  // Save message to database
  const saveMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
    const currentSessionId = sessionIdRef.current
    if (!currentSessionId) return

    try {
      await fetch(`/api/coaching-sessions/${currentSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content })
      })
    } catch (err) {
      console.error('[useGoalCoaching] Failed to save message:', err)
    }
  }, [])

  // Update session stage in database
  const updateSessionStage = useCallback(async (newStage: CoachingStage, goalId?: string) => {
    const currentSessionId = sessionIdRef.current
    if (!currentSessionId) return

    try {
      const body: Record<string, unknown> = { stage: newStage }
      if (goalId) body.goal_id = goalId

      await fetch(`/api/coaching-sessions/${currentSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    } catch (err) {
      console.error('[useGoalCoaching] Failed to update session:', err)
    }
  }, [])

  // Create a new session
  const createSession = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/coaching-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'welcome' })
      })
      const data = await response.json()
      if (data.session?.id) {
        setSessionId(data.session.id)
        sessionIdRef.current = data.session.id
        return data.session.id
      }
      return null
    } catch (err) {
      console.error('[useGoalCoaching] Failed to create session:', err)
      return null
    }
  }, [])

  // Link session to goal
  const linkSessionToGoal = useCallback(async (goalId: string) => {
    const currentSessionId = sessionIdRef.current
    if (!currentSessionId) return

    try {
      await fetch(`/api/coaching-sessions/${currentSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_id: goalId, is_active: false })
      })
    } catch (err) {
      console.error('[useGoalCoaching] Failed to link session to goal:', err)
    }
  }, [])

  // Update goal in database (for continuation updates)
  const updateGoalInDb = useCallback(async (updates: { title?: string; why_root?: string; micro_win?: string; notes?: string }) => {
    const goalId = existingSession?.goal_id
    if (!goalId) {
      console.error('[useGoalCoaching] No goal_id to update')
      return false
    }

    console.log('[useGoalCoaching] updateGoalInDb called with:', { goalId, updates })

    try {
      // Separate micro_win from goal fields (micro_wins go to a different table)
      const { micro_win, ...goalFields } = updates

      // Update goal fields if any (title, why_root)
      if (Object.keys(goalFields).length > 0) {
        console.log('[useGoalCoaching] Updating goal fields:', goalFields)
        const response = await fetch(`/api/goals/${goalId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(goalFields)
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('[useGoalCoaching] Failed to update goal in db:', errorData)
          return false
        }
      }

      // Add new micro-win if provided (goes to micro_wins table)
      if (micro_win) {
        console.log('[useGoalCoaching] Adding new micro-win:', micro_win)
        const microWinResponse = await fetch(`/api/goals/${goalId}/micro-wins`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: micro_win, is_current: true })
        })

        if (!microWinResponse.ok) {
          const errorData = await microWinResponse.json()
          console.error('[useGoalCoaching] Failed to add micro-win:', errorData)
        }
      }

      console.log('[useGoalCoaching] Goal updated successfully')
      return true
    } catch (err) {
      console.error('[useGoalCoaching] Failed to update goal:', err)
      return false
    }
  }, [existingSession?.goal_id])

  const sendMessage = useCallback(async (userMessage?: string) => {
    setIsLoading(true)
    setError(null)

    // Build context from refs to avoid stale closures
    const currentMessages = messagesRef.current
    const currentStage = stageRef.current
    const currentGoalData = goalDataRef.current
    const currentSessionId = sessionIdRef.current
    const currentIsComplete = isCompleteRef.current

    // Check if this is a continuation of a completed session
    const isContinuation = !!(currentIsComplete && userMessage && existingSession)

    console.log('[useGoalCoaching] sendMessage called:', {
      userMessage,
      currentStage,
      currentGoalData,
      messageCount: currentMessages.length,
      isContinuation
    })

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

      // Save user message to database
      await saveMessage('user', userMessage)
    }

    try {
      // Use continuation stage if this is a completed session being continued
      const effectiveStage = isContinuation ? 'continuation' : currentStage

      const context: CoachingContext = {
        stage: effectiveStage,
        goalTitle: currentGoalData.title,
        whyRoot: currentGoalData.whyRoot,
        microWin: currentGoalData.microWin,
        conversationHistory: updatedMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        isContinuation
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

      console.log('[useGoalCoaching] API response:', {
        message: data.message?.substring(0, 50) + '...',
        goalTitle: data.goalTitle,
        whyRoot: data.whyRoot,
        microWin: data.microWin,
        notes: data.notes,
        isComplete: data.isComplete,
        isUpdate: data.isUpdate,
        updateType: data.updateType,
        error: data.error
      })

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      // Add assistant message with optional update info
      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        updateInfo: data.isUpdate && data.updateType ? {
          type: data.updateType,
          value: data.goalTitle || data.whyRoot || data.microWin || data.notes || ''
        } : undefined
      }
      setMessages(prev => [...prev, assistantMsg])

      // Save assistant message to database
      await saveMessage('assistant', data.message)

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
      if (data.notes) {
        newGoalData.notes = data.notes
        dataUpdated = true
      }

      if (dataUpdated) {
        console.log('[useGoalCoaching] Goal data updated:', newGoalData)
        setGoalData(newGoalData)
        // Also update the ref immediately so next call has fresh data
        goalDataRef.current = newGoalData

        // If this is a continuation update, save to database
        if (data.isUpdate && isContinuation) {
          const dbUpdates: { title?: string; why_root?: string; micro_win?: string; notes?: string } = {}
          if (data.goalTitle) dbUpdates.title = data.goalTitle
          if (data.whyRoot) dbUpdates.why_root = data.whyRoot
          if (data.microWin) dbUpdates.micro_win = data.microWin
          if (data.notes) dbUpdates.notes = data.notes
          await updateGoalInDb(dbUpdates)
        }
      }

      // Advance stage based on current state
      const updatedContext: CoachingContext = {
        ...context,
        goalTitle: newGoalData.title,
        whyRoot: newGoalData.whyRoot,
        microWin: newGoalData.microWin,
        notes: newGoalData.notes
      }

      // Determine if we should advance stage
      const shouldAdvance =
        currentStage === 'welcome' || // Always advance from welcome after first response
        dataUpdated || // Advance when we capture data
        data.isComplete // Advance on completion

      if (shouldAdvance) {
        const nextStage = getNextStage(currentStage, updatedContext)
        console.log('[useGoalCoaching] Stage transition:', currentStage, '->', nextStage)
        setStage(nextStage)
        // Also update the ref immediately
        stageRef.current = nextStage
        // Save stage to database
        await updateSessionStage(nextStage)
      }

      // Check for completion
      if (data.isComplete) {
        console.log('[useGoalCoaching] Goal COMPLETE! Final data:', newGoalData)
        setIsComplete(true)
      }

      return data
    } catch (err) {
      // Parse error to provide user-friendly message
      let errorMessage = 'Something went wrong. Please try again.'

      if (err instanceof Error) {
        // Check if error message looks like JSON (raw API error)
        const msg = err.message
        if (msg.startsWith('{') || msg.startsWith('[')) {
          try {
            const parsed = JSON.parse(msg)
            errorMessage = parsed.error || parsed.message || 'An unexpected error occurred. Please try again.'
          } catch {
            errorMessage = 'Unable to connect to the coaching service. Please try again.'
          }
        } else if (msg.includes('Failed to')) {
          // Clean up common error prefixes
          errorMessage = 'Unable to get a response. Please try again.'
        } else {
          errorMessage = msg
        }
      }

      // Ensure we never show raw JSON to users
      if (errorMessage.startsWith('{') || errorMessage.startsWith('[')) {
        errorMessage = 'An unexpected error occurred. Please try again.'
      }

      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [saveMessage, updateSessionStage, existingSession, updateGoalInDb])

  const startConversation = useCallback(async () => {
    console.log('[useGoalCoaching] startConversation called, isStarted:', isStartedRef.current)
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

    // Create a new session in the database
    await createSession()

    console.log('[useGoalCoaching] Sending initial welcome request...')
    // Send initial message to get the welcome
    try {
      await sendMessage()
      console.log('[useGoalCoaching] Welcome complete, current stageRef:', stageRef.current)
    } catch {
      // Error is already set in sendMessage
    }
  }, [sendMessage, createSession])

  const reset = useCallback(() => {
    setMessages([])
    setStage('welcome')
    setGoalData({})
    setIsLoading(false)
    setError(null)
    setIsComplete(false)
    setSessionId(null)
    isStartedRef.current = false
    messagesRef.current = []
    stageRef.current = 'welcome'
    goalDataRef.current = {}
    sessionIdRef.current = null
  }, [])

  return {
    messages,
    stage,
    goalData,
    isLoading,
    error,
    isComplete,
    sessionId,
    sendMessage,
    startConversation,
    reset,
    linkSessionToGoal
  }
}
