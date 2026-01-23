'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useKnowledgeGraph } from '@/hooks/useKnowledgeGraph'
import { useSavedFilters } from '@/hooks/useSavedFilters'
import { KnowledgeGraph, GoalColorInfo } from '@/components/graph/KnowledgeGraph'
import { GraphControls } from '@/components/graph/GraphControls'
import { GraphLegend } from '@/components/graph/GraphLegend'
import { NotePanel } from '@/components/graph/NotePanel'
import { Loading } from '@/components/ui/Loading'
import type { SavedFilter, RecencyRange } from '@/types/graph'

export default function GraphPage() {
  const { data, loading, error, selectedNode, setSelectedNode, refresh } = useKnowledgeGraph()
  const { savedFilters, saveFilter, deleteFilter } = useSavedFilters()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [recencyRange, setRecencyRange] = useState<RecencyRange | null>(null)
  const [goalColors, setGoalColors] = useState<GoalColorInfo[]>([])

  const handleGoalColorsChange = useCallback((colors: GoalColorInfo[]) => {
    setGoalColors(colors)
  }, [])

  // Get unique tags from all nodes
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    data.nodes.forEach(node => node.tags.forEach(tag => tags.add(tag)))
    return Array.from(tags).sort()
  }, [data.nodes])

  // Filter nodes based on search, tags, and date range
  const filteredData = useMemo(() => {
    let nodes = data.nodes

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      nodes = nodes.filter(node =>
        node.title.toLowerCase().includes(query) ||
        node.content.toLowerCase().includes(query)
      )
    }

    if (selectedTags.length > 0) {
      nodes = nodes.filter(node =>
        selectedTags.some(tag => node.tags.includes(tag))
      )
    }

    // Filter by recency range (percentage-based slicing)
    // Notes are sorted by created_at desc (newest first, index 0)
    // Slider: 0% = oldest, 100% = newest
    // So we need to invert: 100% maps to index 0 (newest)
    if (recencyRange) {
      const totalCount = nodes.length
      // Convert percentage to array indices (inverted because array is newest-first)
      const startIndex = Math.floor(((100 - recencyRange.end) / 100) * totalCount)
      const endIndex = Math.ceil(((100 - recencyRange.start) / 100) * totalCount)
      nodes = nodes.slice(startIndex, endIndex)
    }

    const nodeIds = new Set(nodes.map(n => n.id))
    const links = data.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id
      return nodeIds.has(sourceId) && nodeIds.has(targetId)
    })

    return { nodes, links }
  }, [data, searchQuery, selectedTags, recencyRange])

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleApplyFilter = useCallback((filter: SavedFilter) => {
    setSearchQuery(filter.searchQuery)
    setSelectedTags(filter.tags)
    setRecencyRange(filter.recencyRange)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={refresh} className="text-muted hover:text-foreground">
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 bg-background/80 backdrop-blur-sm border-b border-border z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-muted hover:text-foreground transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-medium">Knowledge Graph</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted">
          <span>{filteredData.nodes.length} notes, {filteredData.links.length} connections</span>
          {filteredData.nodes.length > 20 && (
            <span className="text-xs">Hover nodes to see labels</span>
          )}
        </div>
      </div>

      {/* Graph container */}
      <div className="pt-14 h-screen relative">
        <GraphControls
          tags={allTags}
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={refresh}
          totalNotes={data.nodes.length}
          recencyRange={recencyRange}
          onRecencyRangeChange={setRecencyRange}
          savedFilters={savedFilters}
          onSaveFilter={saveFilter}
          onDeleteFilter={deleteFilter}
          onApplyFilter={handleApplyFilter}
        />

        <KnowledgeGraph
          data={filteredData}
          onNodeClick={setSelectedNode}
          selectedNodeId={selectedNode?.id}
          onGoalColorsChange={handleGoalColorsChange}
        />

        <GraphLegend goalColors={goalColors} />

        {selectedNode && (
          <NotePanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onDelete={refresh}
          />
        )}
      </div>
    </div>
  )
}
