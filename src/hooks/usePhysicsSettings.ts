'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PhysicsSettings } from '@/types/graph'
import { DEFAULT_PHYSICS } from '@/types/graph'

const STORAGE_KEY = 'knowledge-graph-physics'

export function usePhysicsSettings() {
  const [physics, setPhysics] = useState<PhysicsSettings>(DEFAULT_PHYSICS)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setPhysics({ ...DEFAULT_PHYSICS, ...parsed })
      }
    } catch (err) {
      console.error('Error loading physics settings:', err)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever physics change
  useEffect(() => {
    if (!isLoaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(physics))
    } catch (err) {
      console.error('Error saving physics settings:', err)
    }
  }, [physics, isLoaded])

  const updatePhysics = useCallback((updates: Partial<PhysicsSettings>) => {
    setPhysics(prev => ({ ...prev, ...updates }))
  }, [])

  const resetPhysics = useCallback(() => {
    setPhysics(DEFAULT_PHYSICS)
  }, [])

  return {
    physics,
    updatePhysics,
    resetPhysics,
    isLoaded,
  }
}
