'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useKnowledgeGraph } from '@/hooks/useKnowledgeGraph'
import { useGraphGroups } from '@/hooks/useGraphGroups'
import { usePhysicsSettings } from '@/hooks/usePhysicsSettings'
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph'
import { GraphPanel } from '@/components/graph/GraphPanel'
import { NotePanel } from '@/components/graph/NotePanel'
import { Loading } from '@/components/ui/Loading'
import type { RecencyRange } from '@/types/graph'

export default function GraphPage() {
  const { data, loading, error, selectedNode, setSelectedNode, refresh } = useKnowledgeGraph()
  const { groups, createGroup, deleteGroup, updateGroup, reorderGroups, isLoaded: groupsLoaded } = useGraphGroups()
  const { physics, updatePhysics, resetPhysics, isLoaded: physicsLoaded } = usePhysicsSettings()

  const settingsLoaded = groupsLoaded && physicsLoaded
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [recencyRange, setRecencyRange] = useState<RecencyRange | null>(null)
  const [selectedConnectionTypes, setSelectedConnectionTypes] = useState<string[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])

  const handleConnectionTypeToggle = useCallback((type: string) => {
    setSelectedConnectionTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type)
      } else {
        return [...prev, type]
      }
    })
  }, [])

  const handleGroupToggle = useCallback((groupId: string) => {
    setSelectedGroupIds(prev => {
      // If "none" is selected and we click a group, replace with just that group
      if (prev.includes('__none__')) {
        return [groupId]
      }
      if (prev.length === 0) {
        // Currently showing all - select only this one
        return [groupId]
      }
      if (prev.includes(groupId)) {
        // Deselect - if this is the last one, go back to showing all
        const newSelection = prev.filter(id => id !== groupId)
        return newSelection.length === 0 ? [] : newSelection
      } else {
        return [...prev, groupId]
      }
    })
  }, [])

  const handleSelectAllGroups = useCallback(() => {
    setSelectedGroupIds([])  // Empty means all are shown
  }, [])

  const handleDeselectAllGroups = useCallback(() => {
    setSelectedGroupIds(['__none__'])  // Special marker for "none selected"
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
    let links = data.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id
      return nodeIds.has(sourceId) && nodeIds.has(targetId)
    })

    // Filter by connection type if any are selected
    if (selectedConnectionTypes.length > 0) {
      links = links.filter(link => selectedConnectionTypes.includes(link.type))
    }

    return { nodes, links }
  }, [data, searchQuery, selectedTags, recencyRange, selectedConnectionTypes])

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  // Filter data based on selected groups
  const activeGroups = useMemo(() => {
    if (selectedGroupIds.length === 0) return groups
    if (selectedGroupIds.includes('__none__')) return []
    return groups.filter(g => selectedGroupIds.includes(g.id))
  }, [groups, selectedGroupIds])

  // Helper: check if a node matches a group's filters
  const nodeMatchesGroup = useCallback((node: typeof data.nodes[0], group: typeof groups[0], allNodes: typeof data.nodes) => {
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
      const nodeIndex = allNodes.findIndex(n => n.id === node.id)
      if (nodeIndex === -1) return false

      const totalCount = allNodes.length
      const nodePercent = 100 - (nodeIndex / totalCount) * 100

      if (nodePercent < group.recencyRange.start || nodePercent > group.recencyRange.end) {
        return false
      }
    }

    return true
  }, [])

  // Check if a node is uncategorized (doesn't match any group)
  const isNodeUncategorized = useCallback((node: typeof data.nodes[0]) => {
    return !groups.some(group => nodeMatchesGroup(node, group, data.nodes))
  }, [groups, nodeMatchesGroup, data.nodes])

  // Filter nodes based on active groups (when groups are selected, show only nodes matching those groups)
  const groupFilteredData = useMemo(() => {
    // If no groups selected or showing all, don't filter by groups
    if (selectedGroupIds.length === 0) {
      return filteredData
    }

    // If "none" selected, show no nodes
    if (selectedGroupIds.includes('__none__')) {
      return { nodes: [], links: [] }
    }

    // Check if uncategorized is selected
    const showUncategorized = selectedGroupIds.includes('__uncategorized__')
    const regularGroupIds = selectedGroupIds.filter(id => id !== '__uncategorized__')

    // Filter nodes to only those matching at least one active group or uncategorized
    const nodes = filteredData.nodes.filter(node => {
      // Check if matches any selected regular group
      const matchesGroup = activeGroups.some(group => nodeMatchesGroup(node, group, data.nodes))

      // Check if should show as uncategorized
      const matchesUncategorized = showUncategorized && isNodeUncategorized(node)

      return matchesGroup || matchesUncategorized
    })

    const nodeIds = new Set(nodes.map(n => n.id))
    const links = filteredData.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id
      return nodeIds.has(sourceId) && nodeIds.has(targetId)
    })

    return { nodes, links }
  }, [filteredData, selectedGroupIds, activeGroups, nodeMatchesGroup, data.nodes, isNodeUncategorized])

  if (loading || !settingsLoaded) {
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
      <div className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-3 sm:px-4 bg-background/80 backdrop-blur-sm border-b border-border z-30">
        <div className="flex items-center gap-2 sm:gap-4">
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
          <h1 className="text-base sm:text-lg font-medium">Knowledge Graph</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted">
          <span>{groupFilteredData.nodes.length} notes</span>
          <span className="hidden sm:inline">{groupFilteredData.links.length} connections</span>
          {groupFilteredData.nodes.length > 20 && (
            <span className="hidden sm:inline text-xs">Hover nodes to see labels</span>
          )}
        </div>
      </div>

      {/* Graph container */}
      <div className="pt-14 h-screen relative">
        <KnowledgeGraph
          data={groupFilteredData}
          onNodeClick={setSelectedNode}
          selectedNodeId={selectedNode?.id}
          groups={activeGroups}
          physics={physics}
        />

        <GraphPanel
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          tags={allTags}
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
          totalNotes={data.nodes.length}
          recencyRange={recencyRange}
          onRecencyRangeChange={setRecencyRange}
          groups={groups}
          selectedGroupIds={selectedGroupIds}
          onGroupToggle={handleGroupToggle}
          onSelectAllGroups={handleSelectAllGroups}
          onDeselectAllGroups={handleDeselectAllGroups}
          onCreateGroup={createGroup}
          onDeleteGroup={deleteGroup}
          onUpdateGroup={updateGroup}
          onReorderGroups={reorderGroups}
          physics={physics}
          onPhysicsChange={updatePhysics}
          onResetPhysics={resetPhysics}
          selectedConnectionTypes={selectedConnectionTypes}
          onConnectionTypeToggle={handleConnectionTypeToggle}
          onRefresh={refresh}
        />

        {selectedNode && (
          <NotePanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onDelete={refresh}
            onTagsChange={refresh}
            allTags={allTags}
          />
        )}
      </div>
    </div>
  )
}
