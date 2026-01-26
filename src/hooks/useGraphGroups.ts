'use client'

import { useCallback, useMemo } from 'react'
import type { GraphGroup, RecencyRange } from '@/types/graph'
import { GROUP_COLORS } from '@/types/graph'
import { useSettings } from './useSettings'

const SETTINGS_KEY = 'graph_groups'
const LOCAL_STORAGE_KEY = 'knowledge-graph-groups'

export function useGraphGroups() {
  const { value: groups, updateValue, isLoaded, isSaving } = useSettings<GraphGroup[]>({
    key: SETTINGS_KEY,
    defaultValue: [],
    localStorageKey: LOCAL_STORAGE_KEY
  })

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
    updateValue(prev => [...prev, newGroup])
    return newGroup
  }, [groups.length, updateValue])

  const deleteGroup = useCallback((id: string) => {
    updateValue(prev => {
      const filtered = prev.filter(g => g.id !== id)
      // Reindex order after deletion
      return filtered.map((g, i) => ({ ...g, order: i }))
    })
  }, [updateValue])

  const updateGroup = useCallback((id: string, updates: Partial<Omit<GraphGroup, 'id'>>) => {
    updateValue(prev =>
      prev.map(g => (g.id === id ? { ...g, ...updates } : g))
    )
  }, [updateValue])

  const updateGroupColor = useCallback((id: string, color: string) => {
    updateGroup(id, { color })
  }, [updateGroup])

  const reorderGroups = useCallback((newOrder: string[]) => {
    updateValue(prev => {
      const groupMap = new Map(prev.map(g => [g.id, g]))
      return newOrder.map((id, index) => {
        const group = groupMap.get(id)
        if (!group) return null
        return { ...group, order: index }
      }).filter((g): g is GraphGroup => g !== null)
    })
  }, [updateValue])

  // Get groups sorted by order
  const sortedGroups = useMemo(() =>
    [...groups].sort((a, b) => a.order - b.order),
    [groups]
  )

  return {
    groups: sortedGroups,
    createGroup,
    deleteGroup,
    updateGroup,
    updateGroupColor,
    reorderGroups,
    isLoaded,
    isSaving
  }
}
