'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SavedFilter } from '@/types/graph'

const STORAGE_KEY = 'knowledge-graph-saved-filters'

export function useSavedFilters() {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setSavedFilters(JSON.parse(stored))
      }
    } catch (err) {
      console.error('Error loading saved filters:', err)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever filters change
  useEffect(() => {
    if (!isLoaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFilters))
    } catch (err) {
      console.error('Error saving filters:', err)
    }
  }, [savedFilters, isLoaded])

  const saveFilter = useCallback((filter: Omit<SavedFilter, 'id'>) => {
    const newFilter: SavedFilter = {
      ...filter,
      id: crypto.randomUUID(),
    }
    setSavedFilters(prev => [...prev, newFilter])
    return newFilter
  }, [])

  const deleteFilter = useCallback((id: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== id))
  }, [])

  const updateFilter = useCallback((id: string, updates: Partial<Omit<SavedFilter, 'id'>>) => {
    setSavedFilters(prev =>
      prev.map(f => (f.id === id ? { ...f, ...updates } : f))
    )
  }, [])

  return {
    savedFilters,
    saveFilter,
    deleteFilter,
    updateFilter,
    isLoaded,
  }
}
