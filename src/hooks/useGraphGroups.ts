'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GraphGroup, RecencyRange } from '@/types/graph'
import { GROUP_COLORS } from '@/types/graph'

const STORAGE_KEY = 'knowledge-graph-groups'

export function useGraphGroups() {
  const [groups, setGroups] = useState<GraphGroup[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setGroups(JSON.parse(stored))
      }
    } catch (err) {
      console.error('Error loading graph groups:', err)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever groups change
  useEffect(() => {
    if (!isLoaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
    } catch (err) {
      console.error('Error saving graph groups:', err)
    }
  }, [groups, isLoaded])

  const createGroup = useCallback((filter: {
    name: string
    tags: string[]
    recencyRange: RecencyRange | null
    searchQuery: string
  }) => {
    const newGroup: GraphGroup = {
      ...filter,
      id: crypto.randomUUID(),
      color: GROUP_COLORS[groups.length % GROUP_COLORS.length],
      order: groups.length,
    }
    setGroups(prev => [...prev, newGroup])
    return newGroup
  }, [groups.length])

  const deleteGroup = useCallback((id: string) => {
    setGroups(prev => {
      const filtered = prev.filter(g => g.id !== id)
      // Reindex order after deletion
      return filtered.map((g, i) => ({ ...g, order: i }))
    })
  }, [])

  const updateGroup = useCallback((id: string, updates: Partial<Omit<GraphGroup, 'id'>>) => {
    setGroups(prev =>
      prev.map(g => (g.id === id ? { ...g, ...updates } : g))
    )
  }, [])

  const updateGroupColor = useCallback((id: string, color: string) => {
    updateGroup(id, { color })
  }, [updateGroup])

  const reorderGroups = useCallback((newOrder: string[]) => {
    setGroups(prev => {
      const groupMap = new Map(prev.map(g => [g.id, g]))
      return newOrder.map((id, index) => {
        const group = groupMap.get(id)
        if (!group) return null
        return { ...group, order: index }
      }).filter((g): g is GraphGroup => g !== null)
    })
  }, [])

  // Get groups sorted by order
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order)

  return {
    groups: sortedGroups,
    createGroup,
    deleteGroup,
    updateGroup,
    updateGroupColor,
    reorderGroups,
    isLoaded,
  }
}
