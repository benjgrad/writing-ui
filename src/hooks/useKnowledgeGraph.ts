'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GraphData, GraphNode, GraphLink, NoteSource } from '@/types/graph'

interface NoteTagRow {
  note_id: string
  tags: { name: string } | null
}

interface NoteSourceRow {
  note_id: string
  source_type: 'document' | 'coaching_session'
  source_id: string
}

interface NoteRow {
  id: string
  title: string
  content: string
  note_type: string
  created_at: string
}

interface ConnectionRow {
  source_note_id: string
  target_note_id: string
  connection_type: string
  strength: number
}

export function useKnowledgeGraph() {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  const supabase = createClient()

  const fetchGraph = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch all atomic notes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: notes, error: notesError } = await (supabase as any)
        .from('atomic_notes')
        .select('id, title, content, note_type, created_at')
        .order('created_at', { ascending: false })

      if (notesError) throw notesError

      // Fetch all tags for notes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: noteTags, error: tagsError } = await (supabase as any)
        .from('note_tags')
        .select(`
          note_id,
          tags:tag_id (name)
        `)

      if (tagsError) throw tagsError

      // Fetch all connections
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: connections, error: connectionsError } = await (supabase as any)
        .from('note_connections')
        .select('source_note_id, target_note_id, connection_type, strength')

      if (connectionsError) throw connectionsError

      // Fetch note sources
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: noteSources, error: sourcesError } = await (supabase as any)
        .from('note_sources')
        .select('note_id, source_type, source_id')

      // Silently handle missing table (migration not yet applied)
      const sourcesData = sourcesError ? [] : (noteSources || [])

      // Fetch document titles for source links
      const documentIds = sourcesData
        .filter((s: NoteSourceRow) => s.source_type === 'document')
        .map((s: NoteSourceRow) => s.source_id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: documents } = documentIds.length > 0
        ? await (supabase as any)
            .from('documents')
            .select('id, title')
            .in('id', documentIds)
        : { data: [] }

      const documentTitleMap = new Map<string, string>()
      for (const doc of documents || []) {
        documentTitleMap.set(doc.id, doc.title)
      }

      // Fetch coaching session goal info (title and status)
      const sessionIds = sourcesData
        .filter((s: NoteSourceRow) => s.source_type === 'coaching_session')
        .map((s: NoteSourceRow) => s.source_id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sessions } = sessionIds.length > 0
        ? await (supabase as any)
            .from('coaching_sessions')
            .select('id, goals:goal_id (id, title, status)')
            .in('id', sessionIds)
        : { data: [] }

      const sessionGoalMap = new Map<string, { id: string; title: string; status: string }>()
      for (const sess of sessions || []) {
        if (sess.goals) {
          sessionGoalMap.set(sess.id, {
            id: sess.goals.id,
            title: sess.goals.title,
            status: sess.goals.status
          })
        }
      }

      // Build source map and note-to-goal map
      const sourceMap = new Map<string, NoteSource[]>()
      const noteGoalMap = new Map<string, { id: string; title: string; status: string }>()
      for (const ns of sourcesData as NoteSourceRow[]) {
        const sources = sourceMap.get(ns.note_id) || []
        const goalInfo = ns.source_type === 'coaching_session' ? sessionGoalMap.get(ns.source_id) : undefined
        sources.push({
          id: `${ns.note_id}-${ns.source_type}-${ns.source_id}`,
          source_type: ns.source_type,
          source_id: ns.source_id,
          document_title: ns.source_type === 'document' ? documentTitleMap.get(ns.source_id) : undefined,
          session_goal_title: goalInfo?.title
        })
        sourceMap.set(ns.note_id, sources)

        // Track the goal associated with this note (first one wins if multiple)
        if (goalInfo && !noteGoalMap.has(ns.note_id)) {
          noteGoalMap.set(ns.note_id, goalInfo)
        }
      }

      // Build tag map
      const tagMap = new Map<string, string[]>()
      if (noteTags) {
        for (const nt of noteTags as NoteTagRow[]) {
          const tags = tagMap.get(nt.note_id) || []
          if (nt.tags && typeof nt.tags === 'object' && 'name' in nt.tags) {
            tags.push(nt.tags.name)
          }
          tagMap.set(nt.note_id, tags)
        }
      }

      // Transform to graph format
      const nodes: GraphNode[] = ((notes || []) as NoteRow[]).map(note => {
        const goalInfo = noteGoalMap.get(note.id)
        return {
          id: note.id,
          title: note.title,
          content: note.content,
          type: note.note_type,
          tags: tagMap.get(note.id) || [],
          sources: sourceMap.get(note.id) || [],
          goalId: goalInfo?.id,
          goalTitle: goalInfo?.title,
          goalStatus: goalInfo?.status as 'active' | 'parked' | 'completed' | 'archived' | undefined,
          createdAt: note.created_at
        }
      })

      const links: GraphLink[] = ((connections || []) as ConnectionRow[]).map(conn => ({
        source: conn.source_note_id,
        target: conn.target_note_id,
        type: conn.connection_type,
        strength: conn.strength
      }))

      setData({ nodes, links })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  return {
    data,
    loading,
    error,
    selectedNode,
    setSelectedNode,
    refresh: fetchGraph
  }
}
