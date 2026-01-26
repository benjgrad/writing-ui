'use client'

import { useCallback } from 'react'
import type { PhysicsSettings } from '@/types/graph'
import { DEFAULT_PHYSICS } from '@/types/graph'
import { useSettings } from './useSettings'

const SETTINGS_KEY = 'graph_physics'
const LOCAL_STORAGE_KEY = 'knowledge-graph-physics'

export function usePhysicsSettings() {
  const { value: physics, updateValue, resetValue, isLoaded, isSaving } = useSettings<PhysicsSettings>({
    key: SETTINGS_KEY,
    defaultValue: DEFAULT_PHYSICS,
    localStorageKey: LOCAL_STORAGE_KEY
  })

  const updatePhysics = useCallback((updates: Partial<PhysicsSettings>) => {
    updateValue(prev => ({ ...prev, ...updates }))
  }, [updateValue])

  const resetPhysics = useCallback(() => {
    resetValue()
  }, [resetValue])

  return {
    physics,
    updatePhysics,
    resetPhysics,
    isLoaded,
    isSaving
  }
}
