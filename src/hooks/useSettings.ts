'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseSettingsOptions<T> {
  key: string
  defaultValue: T
  localStorageKey?: string // Optional localStorage key for fallback/cache
}

export function useSettings<T>({ key, defaultValue, localStorageKey }: UseSettingsOptions<T>) {
  const [value, setValue] = useState<T>(defaultValue)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingValueRef = useRef<T | null>(null)

  // Load from localStorage first (for immediate display), then from API
  useEffect(() => {
    let isMounted = true

    // Load from localStorage first for immediate display
    if (localStorageKey) {
      try {
        const stored = localStorage.getItem(localStorageKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (isMounted) {
            setValue(parsed)
          }
        }
      } catch (err) {
        console.error(`Error loading ${key} from localStorage:`, err)
      }
    }

    // Then fetch from API (source of truth)
    async function fetchFromApi() {
      try {
        const response = await fetch(`/api/settings/${encodeURIComponent(key)}`)
        if (response.ok) {
          const data = await response.json()
          if (isMounted && data.value !== null) {
            setValue(data.value)
            // Update localStorage cache
            if (localStorageKey) {
              try {
                localStorage.setItem(localStorageKey, JSON.stringify(data.value))
              } catch (err) {
                console.error(`Error caching ${key} to localStorage:`, err)
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error fetching ${key} from API:`, err)
        // Keep localStorage value as fallback
      } finally {
        if (isMounted) {
          setIsLoaded(true)
        }
      }
    }

    fetchFromApi()

    return () => {
      isMounted = false
    }
  }, [key, localStorageKey])

  // Save to API (debounced)
  const saveToApi = useCallback(async (newValue: T) => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/settings/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue })
      })
      if (!response.ok) {
        throw new Error('Failed to save setting')
      }
    } catch (err) {
      console.error(`Error saving ${key} to API:`, err)
    } finally {
      setIsSaving(false)
    }
  }, [key])

  // Update value with debounced save
  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prev => {
      const resolved = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(prev)
        : newValue

      // Update localStorage immediately for fast local access
      if (localStorageKey) {
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(resolved))
        } catch (err) {
          console.error(`Error saving ${key} to localStorage:`, err)
        }
      }

      // Debounce API save
      pendingValueRef.current = resolved
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        if (pendingValueRef.current !== null) {
          saveToApi(pendingValueRef.current)
          pendingValueRef.current = null
        }
      }, 500)

      return resolved
    })
  }, [key, localStorageKey, saveToApi])

  // Reset to default value
  const resetValue = useCallback(() => {
    updateValue(defaultValue)
  }, [defaultValue, updateValue])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        // Save any pending changes before unmount
        if (pendingValueRef.current !== null) {
          saveToApi(pendingValueRef.current)
        }
      }
    }
  }, [saveToApi])

  return {
    value,
    updateValue,
    resetValue,
    isLoaded,
    isSaving
  }
}
