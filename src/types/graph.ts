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
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
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
