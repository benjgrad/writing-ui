'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WordWithTimestamp } from '@/types/document'

const DEBOUNCE_MS = 2000

interface UseAutoSaveOptions {
  documentId: string | null
  userId: string
}

interface PendingSave {
  content: string
  words: WordWithTimestamp[]
  title?: string
}

export function useAutoSave({ documentId, userId }: UseAutoSaveOptions) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentDocId, setCurrentDocId] = useState<string | null>(documentId)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingSaveRef = useRef<PendingSave | null>(null)
  const supabase = createClient()

  const save = useCallback(async (
    content: string,
    words: WordWithTimestamp[],
    title?: string
  ) => {
    setIsSaving(true)
    setError(null)

    console.log('[AutoSave] Saving...', { docId: currentDocId, contentLength: content.length, wordCount: words.length })

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
          console.log('[AutoSave] Created new document:', data.id)
        }
      }

      // Clear pending save on success
      pendingSaveRef.current = null
      setLastSaved(new Date())
      console.log('[AutoSave] Saved successfully')
    } catch (err) {
      console.error('[AutoSave] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [currentDocId, userId, supabase])

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

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      // Save any pending changes before unmounting
      if (pendingSaveRef.current) {
        console.log('[AutoSave] Flushing pending save on unmount')
        const { content, words, title } = pendingSaveRef.current
        save(content, words, title)
      }
    }
  }, [save])

  return {
    isSaving,
    lastSaved,
    error,
    save,
    debouncedSave,
    documentId: currentDocId
  }
}
