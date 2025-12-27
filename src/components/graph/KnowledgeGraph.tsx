'use client'

import { useRef, useEffect, useCallback } from 'react'
import * as d3 from 'd3'
import type { GraphData, GraphNode, GraphLink } from '@/types/graph'

interface KnowledgeGraphProps {
  data: GraphData
  onNodeClick: (node: GraphNode) => void
  selectedNodeId?: string | null
}

export function KnowledgeGraph({ data, onNodeClick, selectedNodeId }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const getNodeColor = useCallback((type: string) => {
    const colors: Record<string, string> = {
      permanent: '#3b82f6',
      fleeting: '#f59e0b',
      literature: '#10b981'
    }
    return colors[type] || '#6b7280'
  }, [])

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

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
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

    // Create force simulation
    const simulation = d3.forceSimulation(data.nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(data.links)
        .id((d) => (d as GraphNode).id)
        .distance(100)
        .strength((d) => (d as GraphLink).strength * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40))

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
      .attr('fill', d => getNodeColor(d.type))
      .attr('stroke', d => d.id === selectedNodeId ? '#fff' : 'transparent')
      .attr('stroke-width', 2)

    // Add labels to nodes
    node.append('text')
      .text(d => d.title.length > 20 ? d.title.substring(0, 20) + '...' : d.title)
      .attr('x', 16)
      .attr('y', 4)
      .attr('font-size', '12px')
      .attr('fill', 'currentColor')
      .attr('class', 'text-foreground')

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0)

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`)
    })

    // Center view on initial load
    svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(1))

    return () => {
      simulation.stop()
    }
  }, [data, selectedNodeId, onNodeClick, getNodeColor, getLinkColor])

  if (data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        <div className="text-center">
          <p className="text-lg">No notes yet</p>
          <p className="text-sm mt-1">Write something and extract notes to see your knowledge graph</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  )
}
