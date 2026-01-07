'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Goal, GoalWithMicroWins, GoalStatus, WhyDrillingMessage } from '@/types/goal'

export function useGoals() {
  const [goals, setGoals] = useState<GoalWithMicroWins[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/goals')
      if (!response.ok) {
        throw new Error('Failed to fetch goals')
      }
      const data = await response.json()
      setGoals(data.goals || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load goals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  // Get goals by status
  const activeGoals = goals.filter(g => g.status === 'active')
  const parkedGoals = goals.filter(g => g.status === 'parked')

  // Create a new goal
  const createGoal = async (
    title: string,
    whyRoot?: string,
    status: GoalStatus = 'active'
  ): Promise<{ goal?: Goal; error?: string }> => {
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, why_root: whyRoot, status })
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || 'Failed to create goal' }
      }

      // Optimistic update
      setGoals(prev => [...prev, { ...data.goal, micro_wins: [], current_micro_win: null }])
      return { goal: data.goal }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to create goal' }
    }
  }

  // Update a goal
  const updateGoal = async (
    id: string,
    updates: Partial<Goal>
  ): Promise<{ goal?: Goal; error?: string }> => {
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || 'Failed to update goal' }
      }

      // Optimistic update
      setGoals(prev =>
        prev.map(g => (g.id === id ? { ...g, ...data.goal } : g))
      )
      return { goal: data.goal }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update goal' }
    }
  }

  // Archive a goal
  const archiveGoal = async (id: string): Promise<{ error?: string }> => {
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        return { error: data.error || 'Failed to archive goal' }
      }

      // Optimistic update
      setGoals(prev => prev.filter(g => g.id !== id))
      return {}
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to archive goal' }
    }
  }

  // Move goal between active and parked
  const moveGoal = async (
    id: string,
    toStatus: 'active' | 'parked'
  ): Promise<{ error?: string }> => {
    const result = await updateGoal(id, { status: toStatus })
    return { error: result.error }
  }

  // Update momentum
  const updateMomentum = async (
    id: string,
    momentum: number
  ): Promise<{ error?: string }> => {
    const result = await updateGoal(id, { momentum })
    return { error: result.error }
  }

  // Complete current micro-win and advance to next
  const completeMicroWin = async (
    goalId: string,
    microWinId: string
  ): Promise<{ error?: string }> => {
    try {
      const response = await fetch(`/api/goals/${goalId}/micro-wins`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          micro_win_id: microWinId,
          completed_at: true
        })
      })

      if (!response.ok) {
        const data = await response.json()
        return { error: data.error || 'Failed to complete micro-win' }
      }

      // Refresh goals to get updated micro-wins
      await fetchGoals()
      return {}
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to complete micro-win' }
    }
  }

  // Add a new micro-win to a goal
  const addMicroWin = async (
    goalId: string,
    description: string,
    isCurrent: boolean = false
  ): Promise<{ error?: string }> => {
    try {
      const response = await fetch(`/api/goals/${goalId}/micro-wins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, is_current: isCurrent })
      })

      if (!response.ok) {
        const data = await response.json()
        return { error: data.error || 'Failed to add micro-win' }
      }

      // Refresh goals to get updated micro-wins
      await fetchGoals()
      return {}
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to add micro-win' }
    }
  }

  return {
    goals,
    activeGoals,
    parkedGoals,
    loading,
    error,
    refresh: fetchGoals,
    createGoal,
    updateGoal,
    archiveGoal,
    moveGoal,
    updateMomentum,
    completeMicroWin,
    addMicroWin
  }
}

// Hook for the "Why" drilling conversation
export function useWhyDrilling(goalTitle: string) {
  const [conversation, setConversation] = useState<WhyDrillingMessage[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<string>('')
  const [isComplete, setIsComplete] = useState(false)
  const [whyRoot, setWhyRoot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Start or continue the drilling
  const drill = useCallback(async (userResponse?: string) => {
    setLoading(true)
    setError(null)

    const newConversation = [...conversation]

    // Add user's response if provided
    if (userResponse) {
      newConversation.push({ role: 'user', content: userResponse })
    }

    try {
      const response = await fetch('/api/ai/drill-why', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_title: goalTitle,
          conversation: newConversation
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      // Add AI response to conversation
      newConversation.push({ role: 'assistant', content: data.message })
      setConversation(newConversation)
      setCurrentQuestion(data.message)

      if (data.is_complete) {
        setIsComplete(true)
        setWhyRoot(data.why_root)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [goalTitle, conversation])

  // Reset the conversation
  const reset = useCallback(() => {
    setConversation([])
    setCurrentQuestion('')
    setIsComplete(false)
    setWhyRoot(null)
    setError(null)
  }, [])

  return {
    conversation,
    currentQuestion,
    isComplete,
    whyRoot,
    loading,
    error,
    drill,
    reset
  }
}
