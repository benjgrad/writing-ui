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

// GraphGroup extends SavedFilter with color and priority order
export interface GraphGroup {
  id: string
  name: string
  color: string           // hex color for nodes in this group
  order: number           // priority (lower = higher priority)
  tags: string[]
  recencyRange: RecencyRange | null
  searchQuery: string
}

export interface PhysicsSettings {
  centerForce: number     // 0-1, default 0.5
  repelForce: number      // 0-100, default 20 (Obsidian uses ~16)
  linkForce: number       // 0-1, default 0.4
  linkDistance: number    // 20-300, default 150
}

export const DEFAULT_PHYSICS: PhysicsSettings = {
  centerForce: 0.5,
  repelForce: 20,        // Much lower - Obsidian uses ~16
  linkForce: 0.4,
  linkDistance: 150,
}

export const GROUP_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
]

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
