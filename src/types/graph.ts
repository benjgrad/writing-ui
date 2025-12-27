export interface GraphNode {
  id: string
  title: string
  content: string
  type: string
  tags: string[]
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
