'use client'

import { useRef, useEffect, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import type { GraphData, GraphNode, GraphLink } from '@/types/graph'

// Color palette for active goals
const GOAL_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']
const PARKED_COLOR = '#9ca3af'
const NO_GOAL_COLOR = '#6b7280'

export interface GoalColorInfo {
  goalId: string
  goalTitle: string
  goalStatus: string
  color: string
}

interface KnowledgeGraphProps {
  data: GraphData
  onNodeClick: (node: GraphNode) => void
  selectedNodeId?: string | null
  compact?: boolean
  height?: string // Custom height class, e.g., 'h-80' or 'h-[60vh]'
  onGoalColorsChange?: (goalColors: GoalColorInfo[]) => void
}

export function KnowledgeGraph({ data, onNodeClick, selectedNodeId, compact = false, height, onGoalColorsChange }: KnowledgeGraphProps) {
  const heightClass = height || (compact ? 'h-80' : 'h-full')
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Build goal color map from nodes
  const goalColorMap = useMemo(() => {
    const map = new Map<string, string>()
    const activeGoals: string[] = []
    const parkedGoals: string[] = []

    // First pass: collect unique goals and sort by status
    data.nodes.forEach(node => {
      if (node.goalId && !map.has(node.goalId)) {
        if (node.goalStatus === 'active') {
          activeGoals.push(node.goalId)
        } else if (node.goalStatus === 'parked') {
          parkedGoals.push(node.goalId)
        }
        // For completed/archived, we'll assign them later
      }
    })

    // Assign colors to active goals
    activeGoals.forEach((goalId, index) => {
      map.set(goalId, GOAL_COLORS[index % GOAL_COLORS.length])
    })

    // Parked goals get gray
    parkedGoals.forEach(goalId => {
      map.set(goalId, PARKED_COLOR)
    })

    // Handle completed/archived - give them lighter/muted versions
    data.nodes.forEach(node => {
      if (node.goalId && !map.has(node.goalId)) {
        if (node.goalStatus === 'completed' || node.goalStatus === 'archived') {
          map.set(node.goalId, PARKED_COLOR) // Use gray for completed/archived too
        }
      }
    })

    return map
  }, [data.nodes])

  // Report goal colors to parent for legend
  useEffect(() => {
    if (onGoalColorsChange) {
      const goalColors: GoalColorInfo[] = []
      const seen = new Set<string>()

      data.nodes.forEach(node => {
        if (node.goalId && !seen.has(node.goalId)) {
          seen.add(node.goalId)
          goalColors.push({
            goalId: node.goalId,
            goalTitle: node.goalTitle || 'Unknown Goal',
            goalStatus: node.goalStatus || 'active',
            color: goalColorMap.get(node.goalId) || NO_GOAL_COLOR
          })
        }
      })

      // Sort: active first, then parked, then others
      goalColors.sort((a, b) => {
        const order = { active: 0, parked: 1, completed: 2, archived: 3 }
        return (order[a.goalStatus as keyof typeof order] || 4) - (order[b.goalStatus as keyof typeof order] || 4)
      })

      onGoalColorsChange(goalColors)
    }
  }, [data.nodes, goalColorMap, onGoalColorsChange])

  const getNodeColor = useCallback((node: GraphNode) => {
    if (node.goalId) {
      return goalColorMap.get(node.goalId) || NO_GOAL_COLOR
    }
    return NO_GOAL_COLOR
  }, [goalColorMap])

  const getLinkColor = useCallback((type: string) => {
    const colors: Record<string, string> = {
      related: '#9ca3af',
      supports: '#22c55e',
      contradicts: '#ef4444',
      extends: '#8b5cf6',
      example_of: '#f59e0b'
    }
    return colors[type] || '#9ca3af'
  }, [])

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.nodes.length === 0) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    // Track current zoom scale for label sizing
    let currentZoomScale = 1

    // Create zoom behavior with label scaling
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        currentZoomScale = event.transform.k

        // Scale labels inversely to zoom so they remain readable at constant size
        const inverseScale = 1 / currentZoomScale
        g.selectAll<SVGGElement, GraphNode>('.label-group')
          .attr('transform', `scale(${inverseScale})`)
      })

    svg.call(zoom)

    const g = svg.append('g')

    // Create arrow markers for links
    const defs = svg.append('defs')
    const connectionTypes = ['related', 'supports', 'contradicts', 'extends', 'example_of']

    connectionTypes.forEach(type => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', getLinkColor(type))
        .attr('d', 'M0,-5L10,0L0,5')
    })

    // Scale forces based on node count
    const nodeCount = data.nodes.length
    const linkDistance = Math.max(50, 120 - nodeCount)

    // Group nodes by their primary tag (first tag)
    const tagGroups = new Map<string, GraphNode[]>()
    data.nodes.forEach(node => {
      const primaryTag = node.tags[0] || '_untagged'
      const group = tagGroups.get(primaryTag) || []
      group.push(node)
      tagGroups.set(primaryTag, group)
    })

    // Custom force: nodes with shared tags attract each other
    function tagAttractionForce(alpha: number) {
      const strength = 0.15
      data.nodes.forEach((nodeA, i) => {
        if (nodeA.tags.length === 0) return

        data.nodes.forEach((nodeB, j) => {
          if (i >= j || nodeB.tags.length === 0) return

          // Count shared tags
          const sharedTags = nodeA.tags.filter(t => nodeB.tags.includes(t)).length
          if (sharedTags === 0) return

          // Pull nodes together based on shared tags
          const dx = (nodeB.x || 0) - (nodeA.x || 0)
          const dy = (nodeB.y || 0) - (nodeA.y || 0)
          const distance = Math.sqrt(dx * dx + dy * dy) || 1

          // Stronger pull for more shared tags, weaker at close distances
          const pull = alpha * strength * sharedTags * Math.min(distance / 100, 1)

          nodeA.x = (nodeA.x || 0) + dx * pull
          nodeA.y = (nodeA.y || 0) + dy * pull
          nodeB.x = (nodeB.x || 0) - dx * pull
          nodeB.y = (nodeB.y || 0) - dy * pull
        })
      })
    }

    // Track which nodes have connections
    const connectedNodeIds = new Set<string>()
    data.links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id
      connectedNodeIds.add(sourceId)
      connectedNodeIds.add(targetId)
    })

    // Create force simulation
    const simulation = d3.forceSimulation(data.nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(data.links)
        .id((d) => (d as GraphNode).id)
        .distance(linkDistance)
        .strength(0.4)
      )
      .force('charge', d3.forceManyBody().strength(-150)) // Repulsion separates unrelated nodes
      .force('tagAttraction', tagAttractionForce) // Pull nodes with same tags together
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))
      // Keep unconnected nodes from drifting too far - constrain to a radius
      .force('radial', d3.forceRadial(
        (d) => connectedNodeIds.has((d as GraphNode).id) ? 0 : Math.min(width, height) / 3,
        width / 2,
        height / 2
      ).strength((d) => connectedNodeIds.has((d as GraphNode).id) ? 0 : 0.1))
      .alphaDecay(0.02)

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', d => getLinkColor(d.type))
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.max(1, d.strength * 3))
      .attr('marker-end', d => `url(#arrow-${d.type})`)

    // Create drag behavior
    const dragBehavior = d3.drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    // Create node groups
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(data.nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(dragBehavior)
      .on('click', (_, d) => onNodeClick(d))

    // Add circles to nodes
    node.append('circle')
      .attr('r', d => d.id === selectedNodeId ? 14 : 10)
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', d => d.id === selectedNodeId ? '#fff' : 'transparent')
      .attr('stroke-width', 2)

    // Create label group that will be scaled inversely to zoom
    const labelGroup = node.append('g')
      .attr('class', 'label-group')
      .attr('opacity', 0) // Hidden by default
      .style('pointer-events', 'none') // Let clicks pass through to the node

    // Add background rect for label readability
    labelGroup.append('rect')
      .attr('x', 14)
      .attr('y', -12)
      .attr('width', d => d.title.length * 7 + 16)
      .attr('height', 22)
      .attr('fill', 'var(--background)')
      .attr('opacity', 0.95)
      .attr('rx', 4)
      .attr('class', 'label-bg')

    // Add full labels to nodes - no truncation
    labelGroup.append('text')
      .text(d => d.title)
      .attr('x', 22)
      .attr('y', 4)
      .attr('font-size', '12px')
      .attr('fill', 'currentColor')
      .attr('class', 'text-foreground pointer-events-none')

    // Show labels on hover
    node.on('mouseenter', function() {
      d3.select(this).select('circle').attr('r', 14)
      d3.select(this).select('.label-group').attr('opacity', 1)
    })
    node.on('mouseleave', function(_, d) {
      if (d.id !== selectedNodeId) {
        d3.select(this).select('circle').attr('r', 10)
        d3.select(this).select('.label-group').attr('opacity', 0)
      }
    })

    // Show label for selected node
    if (selectedNodeId) {
      node.filter(d => d.id === selectedNodeId)
        .select('.label-group').attr('opacity', 1)
    }

    // Add title tooltip for full text
    node.append('title')
      .text(d => d.title)

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0)

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`)
    })

    // Auto-zoom to fit content after simulation settles
    simulation.on('end', () => {
      const bounds = g.node()?.getBBox()
      if (bounds) {
        const fullWidth = bounds.width + 100
        const fullHeight = bounds.height + 100
        const midX = bounds.x + bounds.width / 2
        const midY = bounds.y + bounds.height / 2
        const scale = Math.min(0.9, Math.min(width / fullWidth, height / fullHeight))
        const translate = [width / 2 - scale * midX, height / 2 - scale * midY]

        svg.transition()
          .duration(500)
          .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale))
      }
    })

    return () => {
      simulation.stop()
    }
  }, [data, selectedNodeId, onNodeClick, getNodeColor, getLinkColor])

  if (data.nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center text-muted ${heightClass}`}>
        <div className="text-center">
          <p className={compact ? 'text-base' : 'text-lg'}>No notes yet</p>
          <p className="text-sm mt-1">Write something and extract notes to see your knowledge graph</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`w-full ${heightClass}`}>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  )
}
