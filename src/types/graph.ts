export interface NoteSource {
  id: string
  source_type: 'document' | 'coaching_session'
  source_id: string
  // Populated from joined data
  document_title?: string
  session_goal_title?: string
}

export interface GraphNode {
  id: string
  title: string
  content: string
  type: string
  tags: string[]
  sources: NoteSource[]
  goalId?: string
  goalTitle?: string
  goalStatus?: 'active' | 'parked' | 'completed' | 'archived'
  createdAt: string
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

// Recency range as percentage (0-100) where 0 is oldest, 100 is newest
// [start, end] means show notes from position start% to end%
export interface RecencyRange {
  start: number // 0-100
  end: number   // 0-100
}

export interface SavedFilter {
  id: string
  name: string
  tags: string[]
  recencyRange: RecencyRange | null
  searchQuery: string
}

export interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  type: string
  strength: number
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}
