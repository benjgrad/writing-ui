'use client'

import { useRef, useEffect, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import type { GraphData, GraphNode, GraphGroup, PhysicsSettings } from '@/types/graph'
import { DEFAULT_PHYSICS } from '@/types/graph'

const DEFAULT_NODE_COLOR = '#6b7280'

interface KnowledgeGraphProps {
  data: GraphData
  onNodeClick: (node: GraphNode) => void
  selectedNodeId?: string | null
  compact?: boolean
  height?: string // Custom height class, e.g., 'h-80' or 'h-[60vh]'
  groups?: GraphGroup[]
  physics?: PhysicsSettings
}

// Store node positions globally to preserve across re-renders
const nodePositionCache = new Map<string, { x: number; y: number }>()

// Track if this is the initial page load (global to persist across component remounts)
let isInitialPageLoad = true

// Check if a node matches a group's filters
function nodeMatchesGroup(node: GraphNode, group: GraphGroup, allNodes: GraphNode[]): boolean {
  // Check search query
  if (group.searchQuery) {
    const query = group.searchQuery.toLowerCase()
    const matchesQuery = node.title.toLowerCase().includes(query) ||
      node.content.toLowerCase().includes(query)
    if (!matchesQuery) return false
  }

  // Check tags (any match)
  if (group.tags.length > 0) {
    const hasMatchingTag = group.tags.some(tag => node.tags.includes(tag))
    if (!hasMatchingTag) return false
  }

  // Check recency range
  if (group.recencyRange) {
    // Find node's position in the sorted array (newest first)
    const nodeIndex = allNodes.findIndex(n => n.id === node.id)
    if (nodeIndex === -1) return false

    const totalCount = allNodes.length
    // Convert index to percentage (inverted: index 0 = 100%, last index = 0%)
    const nodePercent = 100 - (nodeIndex / totalCount) * 100

    if (nodePercent < group.recencyRange.start || nodePercent > group.recencyRange.end) {
      return false
    }
  }

  return true
}

export function KnowledgeGraph({
  data,
  onNodeClick,
  selectedNodeId,
  compact = false,
  height,
  groups = [],
  physics = DEFAULT_PHYSICS
}: KnowledgeGraphProps) {
  const heightClass = height || (compact ? 'h-80' : 'h-full')
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null)
  const prevSelectedIdRef = useRef<string | null | undefined>(undefined)
  const zoomTransformRef = useRef<d3.ZoomTransform | null>(null)

  // Create a stable key for data to avoid unnecessary rebuilds
  const dataKey = useMemo(() => {
    const nodeIds = data.nodes.map(n => n.id).sort().join(',')
    const linkKeys = data.links.map(l => {
      const src = typeof l.source === 'string' ? l.source : l.source.id
      const tgt = typeof l.target === 'string' ? l.target : l.target.id
      return `${src}-${tgt}`
    }).sort().join(',')
    return `${nodeIds}|${linkKeys}`
  }, [data.nodes, data.links])

  // Create stable key for groups
  const groupsKey = useMemo(() => {
    return groups.map(g => `${g.id}:${g.color}`).join(',')
  }, [groups])

  // Sort groups by order for priority matching
  const sortedGroups = useMemo(() =>
    [...groups].sort((a, b) => a.order - b.order),
    [groups]
  )

  // Get node color based on group membership (first matching group wins)
  const getNodeColor = useCallback((node: GraphNode) => {
    for (const group of sortedGroups) {
      if (nodeMatchesGroup(node, group, data.nodes)) {
        return group.color
      }
    }
    return DEFAULT_NODE_COLOR
  }, [sortedGroups, data.nodes])

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

  // Separate effect for handling selection changes without full re-render
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)

    // Update node appearance for selection
    svg.selectAll<SVGGElement, GraphNode>('g.node-group')
      .each(function(d) {
        const nodeGroup = d3.select(this)
        const isSelected = d.id === selectedNodeId
        const wasSelected = d.id === prevSelectedIdRef.current

        // Update circle
        nodeGroup.select('circle')
          .attr('r', isSelected ? 14 : 10)
          .attr('stroke', isSelected ? '#fff' : 'transparent')

        // Update label visibility
        if (isSelected) {
          nodeGroup.select('.label-group').attr('opacity', 1)
        } else if (wasSelected) {
          nodeGroup.select('.label-group').attr('opacity', 0)
        }
      })

    prevSelectedIdRef.current = selectedNodeId
  }, [selectedNodeId])

  // Main effect for building the graph - uses dataKey and groupsKey for stability
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.nodes.length === 0) return

    const container = containerRef.current
    const width = container.clientWidth
    const svgHeight = container.clientHeight

    // Save current zoom transform before clearing
    const currentTransform = zoomTransformRef.current

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', svgHeight)

    // Track current zoom scale for label sizing
    let currentZoomScale = currentTransform?.k ?? 1

    // Create zoom behavior with label scaling
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        currentZoomScale = event.transform.k
        zoomTransformRef.current = event.transform

        // Scale labels inversely to zoom so they remain readable at constant size
        const inverseScale = 1 / currentZoomScale
        g.selectAll<SVGGElement, GraphNode>('.label-group')
          .attr('transform', `scale(${inverseScale})`)
      })

    svg.call(zoom)

    const g = svg.append('g')

    // Restore previous zoom transform if it exists
    if (currentTransform) {
      svg.call(zoom.transform, currentTransform)
    }

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

    // Restore cached positions or initialize new ones
    data.nodes.forEach(node => {
      const cached = nodePositionCache.get(node.id)
      if (cached) {
        node.x = cached.x
        node.y = cached.y
      }
    })

    // Track which nodes have connections
    const connectedNodeIds = new Set<string>()
    data.links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id
      connectedNodeIds.add(sourceId)
      connectedNodeIds.add(targetId)
    })

    // Create force simulation with physics settings
    // On initial page load: start with high repel to spread nodes, then ramp down
    // On subsequent renders: use configured physics directly
    const shouldRampPhysics = isInitialPageLoad

    const startPhysics = shouldRampPhysics ? {
      centerForce: 0.05,
      repelForce: 300, // Start high so nodes spread out
      linkForce: 0.1,
      linkDistance: 150 // Start longer to spread nodes
    } : physics

    const simulation = d3.forceSimulation(data.nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(data.links)
        .id((d) => (d as GraphNode).id)
        .distance(startPhysics.linkDistance)
        .strength(startPhysics.linkForce)
      )
      .force('charge', d3.forceManyBody().strength(-startPhysics.repelForce))
      // Use forceX and forceY for centering with adjustable strength (forceCenter has no strength param)
      .force('x', d3.forceX(width / 2).strength(startPhysics.centerForce * 0.1))
      .force('y', d3.forceY(svgHeight / 2).strength(startPhysics.centerForce * 0.1))
      .force('collision', d3.forceCollide().radius(20))
      // Keep unconnected nodes from drifting too far - constrain to a radius
      .force('radial', d3.forceRadial(
        (d) => connectedNodeIds.has((d as GraphNode).id) ? 0 : Math.min(width, svgHeight) / 3,
        width / 2,
        svgHeight / 2
      ).strength((d) => connectedNodeIds.has((d as GraphNode).id) ? 0 : 0.03))
      .velocityDecay(0.4)    // Higher = more damping, less jitter (default 0.4)
      .alphaDecay(shouldRampPhysics ? 0.02 : 0.03)      // Slower decay during ramp-up
      .alphaMin(0.005)

    // Gradually ramp physics over 3 seconds - only on initial page load
    let rampInterval: ReturnType<typeof setInterval> | null = null

    if (shouldRampPhysics) {
      const rampDuration = 5000
      const rampStartTime = Date.now()
      rampInterval = setInterval(() => {
        const elapsed = Date.now() - rampStartTime
        const progress = Math.min(1, elapsed / rampDuration)
        // Use easeOutCubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3)

        // Interpolate physics values
        const currentPhysics = {
          centerForce: startPhysics.centerForce + (physics.centerForce - startPhysics.centerForce) * eased,
          repelForce: startPhysics.repelForce + (physics.repelForce - startPhysics.repelForce) * eased,
          linkForce: startPhysics.linkForce + (physics.linkForce - startPhysics.linkForce) * eased,
          linkDistance: startPhysics.linkDistance + (physics.linkDistance - startPhysics.linkDistance) * eased
        }

        // Update forces
        const linkForce = simulation.force('link') as d3.ForceLink<d3.SimulationNodeDatum, d3.SimulationLinkDatum<d3.SimulationNodeDatum>>
        if (linkForce) {
          linkForce.distance(currentPhysics.linkDistance).strength(currentPhysics.linkForce)
        }
        const chargeForce = simulation.force('charge') as d3.ForceManyBody<d3.SimulationNodeDatum>
        if (chargeForce) {
          chargeForce.strength(-currentPhysics.repelForce)
        }
        const xForce = simulation.force('x') as d3.ForceX<d3.SimulationNodeDatum>
        if (xForce) {
          xForce.strength(currentPhysics.centerForce * 0.1)
        }
        const yForce = simulation.force('y') as d3.ForceY<d3.SimulationNodeDatum>
        if (yForce) {
          yForce.strength(currentPhysics.centerForce * 0.1)
        }

        // Keep simulation warm during ramp-up
        simulation.alpha(Math.max(simulation.alpha(), 0.3))

        if (progress >= 1) {
          if (rampInterval) clearInterval(rampInterval)
          // Switch to normal alpha decay after ramp-up
          simulation.alphaDecay(0.0001)
          // Mark initial load as complete
          isInitialPageLoad = false
        }
      }, 50)
    }

    // Store reference for cleanup
    simulationRef.current = simulation

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', d => getLinkColor(d.type))
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.max(1, d.strength * 3))
      .attr('marker-end', d => `url(#arrow-${d.type})`)

    // Create drag behavior with smooth re-warming
    const dragBehavior = d3.drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        // Use lower alphaTarget for smoother re-warming instead of jumping
        if (!event.active) simulation.alphaTarget(0.05).restart()
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

    // Create node groups with class for selection updates
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(data.nodes)
      .join('g')
      .attr('class', 'node-group')
      .attr('cursor', 'pointer')
      .call(dragBehavior)
      .on('click', (_, d) => onNodeClick(d))

    // Add circles to nodes - initial state, selection handled by separate effect
    node.append('circle')
      .attr('r', 10)
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', 'transparent')
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

    // Show labels on hover - use prevSelectedIdRef for current selection state
    node.on('mouseenter', function() {
      d3.select(this).select('circle').attr('r', 14)
      d3.select(this).select('.label-group').attr('opacity', 1)
    })
    node.on('mouseleave', function(_, d) {
      if (d.id !== prevSelectedIdRef.current) {
        d3.select(this).select('circle').attr('r', 10)
        d3.select(this).select('.label-group').attr('opacity', 0)
      }
    })

    // Add title tooltip for full text
    node.append('title')
      .text(d => d.title)

    // Update positions on tick and cache them
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0)

      node.attr('transform', d => {
        // Cache position for next render
        if (d.x !== undefined && d.y !== undefined) {
          nodePositionCache.set(d.id, { x: d.x, y: d.y })
        }
        return `translate(${d.x || 0},${d.y || 0})`
      })
    })

    // Auto-zoom to fit content after simulation settles - only if no existing zoom
    simulation.on('end', () => {
      // Don't auto-zoom if we already have a saved transform
      if (currentTransform) return

      const bounds = g.node()?.getBBox()
      if (bounds) {
        const fullWidth = bounds.width + 100
        const fullHeight = bounds.height + 100
        const midX = bounds.x + bounds.width / 2
        const midY = bounds.y + bounds.height / 2
        const scale = Math.min(0.9, Math.min(width / fullWidth, svgHeight / fullHeight))
        const translate = [width / 2 - scale * midX, svgHeight / 2 - scale * midY]

        const newTransform = d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        zoomTransformRef.current = newTransform
        svg.transition()
          .duration(500)
          .call(zoom.transform, newTransform)
      }
    })

    return () => {
      if (rampInterval) clearInterval(rampInterval)
      simulation.stop()
      simulationRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, groupsKey, onNodeClick, getLinkColor, physics])

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
