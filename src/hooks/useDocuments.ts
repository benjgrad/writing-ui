'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Document } from '@/types/document'

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('documents')
        .select('*')
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setDocuments(data as Document[] || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const archiveDocument = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('documents')
      .update({ is_archived: true })
      .eq('id', id)

    if (!error) {
      setDocuments(prev => prev.filter(doc => doc.id !== id))
    }
    return { error }
  }

  const deleteDocument = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('documents')
      .delete()
      .eq('id', id)

    if (!error) {
      setDocuments(prev => prev.filter(doc => doc.id !== id))
    }
    return { error }
  }

  const searchDocuments = async (query: string) => {
    if (!query.trim()) {
      return fetchDocuments()
    }

    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('documents')
        .select('*')
        .eq('is_archived', false)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setDocuments(data as Document[] || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  return {
    documents,
    loading,
    error,
    refresh: fetchDocuments,
    archiveDocument,
    deleteDocument,
    searchDocuments
  }
}
