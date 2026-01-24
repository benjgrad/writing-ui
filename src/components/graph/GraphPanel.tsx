'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { RangeSlider } from '@/components/ui/RangeSlider'
import { useExtractionStatus } from '@/hooks/useExtractionStatus'
import type { GraphGroup, RecencyRange, PhysicsSettings } from '@/types/graph'
import { GROUP_COLORS } from '@/types/graph'

// Connection types with their display info
const CONNECTION_TYPES = [
  { type: 'related', color: '#9ca3af', label: 'Related' },
  { type: 'supports', color: '#22c55e', label: 'Supports' },
  { type: 'contradicts', color: '#ef4444', label: 'Contradicts' },
  { type: 'extends', color: '#8b5cf6', label: 'Extends' },
  { type: 'example_of', color: '#f59e0b', label: 'Example of' }
]

interface GraphPanelProps {
  // Search
  searchQuery: string
  onSearchChange: (query: string) => void
  // Tags
  tags: string[]
  selectedTags: string[]
  onTagToggle: (tag: string) => void
  // Recency
  totalNotes: number
  recencyRange: RecencyRange | null
  onRecencyRangeChange: (range: RecencyRange | null) => void
  // Groups
  groups: GraphGroup[]
  selectedGroupIds: string[]
  onGroupToggle: (groupId: string) => void
  onSelectAllGroups: () => void
  onDeselectAllGroups: () => void
  onCreateGroup: (filter: { name: string; tags: string[]; recencyRange: RecencyRange | null; searchQuery: string }) => void
  onDeleteGroup: (id: string) => void
  onUpdateGroup: (id: string, updates: Partial<Omit<GraphGroup, 'id'>>) => void
  onReorderGroups: (newOrder: string[]) => void
  // Physics
  physics: PhysicsSettings
  onPhysicsChange: (updates: Partial<PhysicsSettings>) => void
  onResetPhysics: () => void
  // Connection type filter
  selectedConnectionTypes: string[]
  onConnectionTypeToggle: (type: string) => void
  // Refresh
  onRefresh: () => void
}

// Accordion section component
function AccordionSection({
  title,
  isOpen,
  onToggle,
  children,
  badge,
  icon
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  badge?: string | number
  icon?: React.ReactNode
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
          {badge !== undefined && (
            <span className="text-xs px-1.5 py-0.5 bg-foreground/10 rounded-full">{badge}</span>
          )}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {isOpen && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

// Color picker component
function ColorPicker({
  color,
  onChange
}: {
  color: string
  onChange: (color: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-5 h-5 rounded-full border border-border"
        style={{ backgroundColor: color }}
      />
      {isOpen && (
        <div className="absolute bottom-7 left-0 z-50 p-2 bg-background border border-border rounded-lg shadow-lg flex flex-wrap gap-1 w-24">
          {GROUP_COLORS.map(c => (
            <button
              key={c}
              onClick={() => {
                onChange(c)
                setIsOpen(false)
              }}
              className={`w-5 h-5 rounded-full border ${c === color ? 'border-foreground' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function GraphPanel({
  searchQuery,
  onSearchChange,
  tags,
  selectedTags,
  onTagToggle,
  totalNotes,
  recencyRange,
  onRecencyRangeChange,
  groups,
  selectedGroupIds,
  onGroupToggle,
  onSelectAllGroups,
  onDeselectAllGroups,
  onCreateGroup,
  onDeleteGroup,
  onUpdateGroup,
  onReorderGroups,
  physics,
  onPhysicsChange,
  onResetPhysics,
  selectedConnectionTypes,
  onConnectionTypeToggle,
  onRefresh
}: GraphPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [tagSearch, setTagSearch] = useState('')
  const [groupName, setGroupName] = useState('')
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingGroupTagsId, setEditingGroupTagsId] = useState<string | null>(null)
  const [editingGroupTags, setEditingGroupTags] = useState<string[]>([])

  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    search: false,
    groups: true,
    connections: false,
    tags: false,
    recency: false,
    physics: false
  })

  const { stats, isProcessing } = useExtractionStatus()

  // Determine which tags to show as selected in Tags section
  const activeTags = editingGroupTagsId ? editingGroupTags : selectedTags

  // Filter tags by search, with selected/editing tags at top
  const filteredTags = useMemo(() => {
    let result = tags
    if (tagSearch) {
      const search = tagSearch.toLowerCase()
      result = result.filter(tag => tag.toLowerCase().includes(search))
    }
    return [...result].sort((a, b) => {
      const aSelected = activeTags.includes(a)
      const bSelected = activeTags.includes(b)
      if (aSelected && !bSelected) return -1
      if (!aSelected && bSelected) return 1
      return a.localeCompare(b)
    })
  }, [tags, tagSearch, activeTags])

  // Sort groups by order
  const sortedGroups = useMemo(() =>
    [...groups].sort((a, b) => a.order - b.order),
    [groups]
  )

  const hasActiveFilters = selectedTags.length > 0 || recencyRange !== null || searchQuery || selectedConnectionTypes.length > 0

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleCreateGroup = () => {
    if (!groupName.trim()) return
    onCreateGroup({
      name: groupName.trim(),
      tags: selectedTags,
      recencyRange: null,
      searchQuery: ''
    })
    setGroupName('')
    setShowCreateGroup(false)
  }

  const handleClearFilters = () => {
    selectedTags.forEach(tag => onTagToggle(tag))
    onRecencyRangeChange(null)
    onSearchChange('')
    selectedConnectionTypes.forEach(t => onConnectionTypeToggle(t))
    onDeselectAllGroups()
  }

  const handleRecencyChange = (start: number, end: number) => {
    if (start === 0 && end === 100) {
      onRecencyRangeChange(null)
    } else {
      onRecencyRangeChange({ start, end })
    }
  }

  // Handle drag and drop for groups
  const handleDragStart = (e: React.DragEvent, groupId: string) => {
    setDraggedGroupId(groupId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault()
    if (!draggedGroupId || draggedGroupId === targetGroupId) return

    const currentOrder = groups.map(g => g.id)
    const draggedIndex = currentOrder.indexOf(draggedGroupId)
    const targetIndex = currentOrder.indexOf(targetGroupId)

    const newOrder = [...currentOrder]
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedGroupId)

    onReorderGroups(newOrder)
    setDraggedGroupId(null)
  }

  return (
    <div className="absolute bottom-4 left-4 z-20 pointer-events-auto w-72">
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium hover:text-foreground/80 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Graph Controls
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
            <button
              onClick={onRefresh}
              className="text-muted-foreground hover:text-foreground"
              title="Refresh"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
            </button>
            {isProcessing && (
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Extracting..." />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="max-h-[60vh] overflow-y-auto">
            {/* Search Section */}
            <AccordionSection
              title="Search"
              isOpen={openSections.search}
              onToggle={() => toggleSection('search')}
              badge={searchQuery ? '1' : undefined}
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>}
            >
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <Input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-9 h-8 text-sm"
                />
              </div>
            </AccordionSection>

            {/* Groups Section */}
            <AccordionSection
              title="Groups"
              isOpen={openSections.groups}
              onToggle={() => toggleSection('groups')}
              badge={selectedGroupIds.length > 0 ? selectedGroupIds.length : (groups.length || undefined)}
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
            >
              <div className="space-y-2">
                {groups.length > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {selectedGroupIds.length === 0 ? 'All shown' : `${selectedGroupIds.length} selected`}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={onSelectAllGroups}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        All
                      </button>
                      <button
                        onClick={onDeselectAllGroups}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        None
                      </button>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  {sortedGroups.map(group => {
                    const isSelected = selectedGroupIds.length === 0 || selectedGroupIds.includes(group.id)
                    const isEditing = editingGroupId === group.id

                    return (
                      <div
                        key={group.id}
                        draggable={!isEditing}
                        onDragStart={(e) => handleDragStart(e, group.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, group.id)}
                        className={`p-2 rounded border bg-background cursor-move ${
                          draggedGroupId === group.id ? 'opacity-50' : ''
                        } ${isSelected ? 'border-foreground/30' : 'border-border opacity-50'} ${
                          editingGroupTagsId === group.id ? 'ring-1 ring-foreground/50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {/* Checkbox for selection */}
                          <button
                            onClick={() => onGroupToggle(group.id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-foreground border-foreground' : 'border-border'
                            }`}
                          >
                            {isSelected && (
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-background">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                          {/* Drag handle */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-muted-foreground shrink-0"
                          >
                            <circle cx="9" cy="5" r="1" />
                            <circle cx="9" cy="12" r="1" />
                            <circle cx="9" cy="19" r="1" />
                            <circle cx="15" cy="5" r="1" />
                            <circle cx="15" cy="12" r="1" />
                            <circle cx="15" cy="19" r="1" />
                          </svg>
                          <ColorPicker
                            color={group.color}
                            onChange={(color) => onUpdateGroup(group.id, { color })}
                          />
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  onUpdateGroup(group.id, { name: editingName })
                                  setEditingGroupId(null)
                                } else if (e.key === 'Escape') {
                                  setEditingGroupId(null)
                                }
                              }}
                              onBlur={() => {
                                if (editingName.trim()) {
                                  onUpdateGroup(group.id, { name: editingName })
                                }
                                setEditingGroupId(null)
                              }}
                              className="flex-1 text-xs bg-transparent border-b border-foreground/50 outline-none px-1"
                              autoFocus
                            />
                          ) : (
                            <span
                              className="flex-1 text-xs truncate cursor-text"
                              onDoubleClick={() => {
                                setEditingGroupId(group.id)
                                setEditingName(group.name)
                              }}
                              title="Double-click to rename"
                            >
                              {group.name}
                            </span>
                          )}
                          {/* Edit button to edit group tags */}
                          <button
                            onClick={() => {
                              // Start editing this group's tags
                              setEditingGroupTagsId(group.id)
                              setEditingGroupTags([...group.tags])
                              // Open the Tags section
                              setOpenSections(prev => ({ ...prev, tags: true }))
                            }}
                            className={`text-muted-foreground hover:text-foreground ${editingGroupTagsId === group.id ? 'text-foreground' : ''}`}
                            title="Edit tags"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onDeleteGroup(group.id)}
                            className="text-muted-foreground hover:text-red-500"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {/* Uncategorized pseudo-group - only show when there are groups defined */}
                  {groups.length > 0 && (
                    <div
                      className={`p-2 rounded border bg-background ${
                        selectedGroupIds.includes('__uncategorized__') ? 'border-foreground/30' : 'border-border opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onGroupToggle('__uncategorized__')}
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            selectedGroupIds.includes('__uncategorized__') ? 'bg-foreground border-foreground' : 'border-border'
                          }`}
                        >
                          {selectedGroupIds.includes('__uncategorized__') && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-background">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                        <div className="w-5 h-5 rounded-full border border-dashed border-muted-foreground flex items-center justify-center shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4M12 8h.01" />
                          </svg>
                        </div>
                        <span className="flex-1 text-xs text-muted-foreground italic">
                          Uncategorized
                        </span>
                      </div>
                    </div>
                  )}
                  {groups.length === 0 && (
                    <p className="text-xs text-muted-foreground">No groups yet.</p>
                  )}
                </div>

                {showCreateGroup ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Group name..."
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                      className="flex-1 h-7 text-xs"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleCreateGroup} disabled={!groupName.trim()} className="h-7 text-xs px-2">
                      Save
                    </Button>
                    <button onClick={() => { setShowCreateGroup(false); setGroupName('') }} className="text-muted-foreground hover:text-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    + Create group from selected tags
                  </button>
                )}
              </div>
            </AccordionSection>

            {/* Connections Section */}
            <AccordionSection
              title="Connections"
              isOpen={openSections.connections}
              onToggle={() => toggleSection('connections')}
              badge={selectedConnectionTypes.length > 0 && selectedConnectionTypes.length < CONNECTION_TYPES.length ? selectedConnectionTypes.length : undefined}
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="m18 16 4-4-4-4" /><path d="m6 8-4 4 4 4" /><path d="m14.5 4-5 16" /></svg>}
            >
              <div className="space-y-1">
                {CONNECTION_TYPES.map(conn => {
                  const isSelected = selectedConnectionTypes.length === 0 || selectedConnectionTypes.includes(conn.type)
                  return (
                    <button
                      key={conn.type}
                      onClick={() => onConnectionTypeToggle(conn.type)}
                      className={`flex items-center gap-2 w-full px-2 py-1 rounded text-xs transition-colors ${
                        isSelected ? 'bg-accent/50' : 'opacity-40 hover:opacity-70'
                      }`}
                    >
                      <div className="w-4 h-0.5 rounded" style={{ backgroundColor: conn.color }} />
                      <span>{conn.label}</span>
                    </button>
                  )
                })}
              </div>
            </AccordionSection>

            {/* Tags Section */}
            {tags.length > 0 && (
              <AccordionSection
                title="Tags"
                isOpen={openSections.tags}
                onToggle={() => toggleSection('tags')}
                badge={editingGroupTagsId ? `Editing: ${groups.find(g => g.id === editingGroupTagsId)?.name}` : (selectedTags.length || undefined)}
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" /><path d="M7 7h.01" /></svg>}
              >
                <div className="space-y-2">
                  {/* Editing mode header */}
                  {editingGroupTagsId && (
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-border">
                      <span className="text-muted-foreground">
                        Editing <span className="font-medium text-foreground">{groups.find(g => g.id === editingGroupTagsId)?.name}</span>
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            // Save the changes
                            onUpdateGroup(editingGroupTagsId, { tags: editingGroupTags })
                            setEditingGroupTagsId(null)
                            setEditingGroupTags([])
                          }}
                          className="text-xs px-2 py-0.5 bg-foreground text-background rounded hover:bg-foreground/90"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            // Cancel editing
                            setEditingGroupTagsId(null)
                            setEditingGroupTags([])
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {tags.length > 10 && (
                    <Input
                      type="text"
                      placeholder="Search tags..."
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      className="w-full h-7 text-xs"
                    />
                  )}
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                    {filteredTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (editingGroupTagsId) {
                            // Toggle tag in editing group
                            setEditingGroupTags(prev =>
                              prev.includes(tag)
                                ? prev.filter(t => t !== tag)
                                : [...prev, tag]
                            )
                          } else {
                            // Normal tag toggle for filtering
                            onTagToggle(tag)
                          }
                        }}
                        className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                          activeTags.includes(tag)
                            ? 'bg-foreground text-background border-foreground'
                            : 'border-border hover:border-foreground'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              </AccordionSection>
            )}

            {/* Recency Section */}
            {totalNotes > 1 && (
              <AccordionSection
                title="Recency"
                isOpen={openSections.recency}
                onToggle={() => toggleSection('recency')}
                badge={recencyRange ? '1' : undefined}
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
              >
                <div className="space-y-2">
                  <RangeSlider
                    min={0}
                    max={100}
                    start={recencyRange?.start ?? 0}
                    end={recencyRange?.end ?? 100}
                    onChange={handleRecencyChange}
                    formatLabel={(percent) => `${Math.round((percent / 100) * totalNotes)}`}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Oldest</span>
                    <span>Newest</span>
                  </div>
                </div>
              </AccordionSection>
            )}

            {/* Physics Section */}
            <AccordionSection
              title="Physics"
              isOpen={openSections.physics}
              onToggle={() => toggleSection('physics')}
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="12" r="3" /><path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" /></svg>}
            >
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground">Center</label>
                    <span className="text-xs text-muted-foreground">{physics.centerForce.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={physics.centerForce}
                    onChange={(e) => onPhysicsChange({ centerForce: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-border rounded-full appearance-none cursor-pointer accent-foreground"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground">Repel</label>
                    <span className="text-xs text-muted-foreground">{physics.repelForce}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={physics.repelForce}
                    onChange={(e) => onPhysicsChange({ repelForce: parseInt(e.target.value) })}
                    className="w-full h-1 bg-border rounded-full appearance-none cursor-pointer accent-foreground"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground">Link Force</label>
                    <span className="text-xs text-muted-foreground">{physics.linkForce.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={physics.linkForce}
                    onChange={(e) => onPhysicsChange({ linkForce: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-border rounded-full appearance-none cursor-pointer accent-foreground"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground">Link Distance</label>
                    <span className="text-xs text-muted-foreground">{physics.linkDistance}</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    step="10"
                    value={physics.linkDistance}
                    onChange={(e) => onPhysicsChange({ linkDistance: parseInt(e.target.value) })}
                    className="w-full h-1 bg-border rounded-full appearance-none cursor-pointer accent-foreground"
                  />
                </div>
                <button onClick={onResetPhysics} className="text-xs text-muted-foreground hover:text-foreground">
                  Reset defaults
                </button>
              </div>
            </AccordionSection>

          </div>
        )}
      </div>
    </div>
  )
}
