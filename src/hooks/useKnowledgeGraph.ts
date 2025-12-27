'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GraphData, GraphNode, GraphLink } from '@/types/graph'

interface NoteTagRow {
  note_id: string
  tags: { name: string } | null
}

interface NoteRow {
  id: string
  title: string
  content: string
  note_type: string
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
        .select('id, title, content, note_type')
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
      const nodes: GraphNode[] = ((notes || []) as NoteRow[]).map(note => ({
        id: note.id,
        title: note.title,
        content: note.content,
        type: note.note_type,
        tags: tagMap.get(note.id) || []
      }))

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
