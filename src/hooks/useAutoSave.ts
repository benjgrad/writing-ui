'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WordWithTimestamp } from '@/types/document'

const DEBOUNCE_MS = 2000

interface UseAutoSaveOptions {
  documentId: string | null
  userId: string
  onFirstSave?: (documentId: string, content: string) => void
}

interface PendingSave {
  content: string
  words: WordWithTimestamp[]
  title?: string
}

export function useAutoSave({ documentId, userId, onFirstSave }: UseAutoSaveOptions) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentDocId, setCurrentDocId] = useState<string | null>(documentId)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingSaveRef = useRef<PendingSave | null>(null)
  const isFirstSaveRef = useRef(!documentId) // Track if this is a new document
  const supabase = createClient()

  const save = useCallback(async (
    content: string,
    words: WordWithTimestamp[],
    title?: string
  ) => {
    // Don't save if there's no content and no existing document
    // (need content to create a new document, but can update title on existing)
    if (!content && !currentDocId) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const wordCount = content.split(/\s+/).filter(Boolean).length

      if (currentDocId) {
        // Update existing document
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('documents')
          .update({
            content,
            content_with_timestamps: words,
            word_count: wordCount,
            title: title || 'Untitled',
            updated_at: new Date().toISOString()
          })
          .eq('id', currentDocId)

        if (error) throw error
      } else {
        // Create new document
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('documents')
          .insert({
            user_id: userId,
            content,
            content_with_timestamps: words,
            word_count: wordCount,
            title: title || 'Untitled'
          })
          .select('id')
          .single()

        if (error) throw error
        if (data) {
          setCurrentDocId(data.id)
          // Update URL without full navigation
          window.history.replaceState(null, '', `/write/${data.id}`)

          // Trigger onFirstSave callback for new documents
          if (isFirstSaveRef.current && onFirstSave) {
            isFirstSaveRef.current = false
            onFirstSave(data.id, content)
          }
        }
      }

      // Clear pending save on success
      pendingSaveRef.current = null
      setLastSaved(new Date())
    } catch (err) {
      console.error('[AutoSave] Error:', err)
      // Handle both Error objects and Supabase error objects
      let errorMessage = 'Failed to save'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (err && typeof err === 'object') {
        // Supabase errors often have message, details, or code properties
        const supaError = err as { message?: string; details?: string; code?: string; error?: string }
        errorMessage = supaError.message || supaError.details || supaError.error || supaError.code || 'Failed to save'
      }
      setError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }, [currentDocId, userId, supabase, onFirstSave])

  const debouncedSave = useCallback((
    content: string,
    words: WordWithTimestamp[],
    title?: string
  ) => {
    // Track pending save for flush on unmount
    pendingSaveRef.current = { content, words, title }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      save(content, words, title)
    }, DEBOUNCE_MS)
  }, [save])

  // Clean up timeout on unmount
  // Note: We don't try to save during cleanup as calling async functions during
  // React cleanup can cause issues. The debounced save should complete naturally.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    isSaving,
    lastSaved,
    error,
    save,
    debouncedSave,
    documentId: currentDocId
  }
}
