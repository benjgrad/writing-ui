'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { RangeSlider } from '@/components/ui/RangeSlider'
import { useExtractionStatus } from '@/hooks/useExtractionStatus'
import type { GraphGroup, RecencyRange, PhysicsSettings } from '@/types/graph'
import { GROUP_COLORS, DEFAULT_PHYSICS } from '@/types/graph'

// Connection types with their display info
const CONNECTION_TYPES = [
  { type: 'related', color: '#9ca3af', label: 'Related' },
  { type: 'supports', color: '#22c55e', label: 'Supports' },
  { type: 'contradicts', color: '#ef4444', label: 'Contradicts' },
  { type: 'extends', color: '#8b5cf6', label: 'Extends' },
  { type: 'example_of', color: '#f59e0b', label: 'Example of' }
]

interface GraphControlsProps {
  tags: string[]
  selectedTags: string[]
  onTagToggle: (tag: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onRefresh: () => void
  totalNotes: number
  recencyRange: RecencyRange | null
  onRecencyRangeChange: (range: RecencyRange | null) => void
  // Groups
  groups: GraphGroup[]
  onCreateGroup: (filter: { name: string; tags: string[]; recencyRange: RecencyRange | null; searchQuery: string }) => void
  onDeleteGroup: (id: string) => void
  onUpdateGroup: (id: string, updates: Partial<Omit<GraphGroup, 'id'>>) => void
  onReorderGroups: (newOrder: string[]) => void
  onApplyGroup: (group: GraphGroup) => void
  // Physics
  physics: PhysicsSettings
  onPhysicsChange: (updates: Partial<PhysicsSettings>) => void
  onResetPhysics: () => void
  // Connection type filter
  selectedConnectionTypes: string[]
  onConnectionTypeToggle: (type: string) => void
}

// Accordion section component
function AccordionSection({
  title,
  isOpen,
  onToggle,
  children,
  badge
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  badge?: string | number
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent/50 transition-colors"
      >
        <span className="flex items-center gap-2">
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
        <div className="absolute top-7 left-0 z-50 p-2 bg-background border border-border rounded-lg shadow-lg flex flex-wrap gap-1 w-24">
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

export function GraphControls({
  tags,
  selectedTags,
  onTagToggle,
  searchQuery,
  onSearchChange,
  onRefresh,
  totalNotes,
  recencyRange,
  onRecencyRangeChange,
  groups,
  onCreateGroup,
  onDeleteGroup,
  onUpdateGroup,
  onReorderGroups,
  onApplyGroup,
  physics,
  onPhysicsChange,
  onResetPhysics,
  selectedConnectionTypes,
  onConnectionTypeToggle
}: GraphControlsProps) {
  const [showPanel, setShowPanel] = useState(false)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const [groupName, setGroupName] = useState('')
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null) // Track which group is "active" for editing
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null) // Track which group name is being edited
  const [editingName, setEditingName] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    groups: true,
    physics: false,
    connections: false,
    tags: false,
    recency: false
  })

  // Check if current filters differ from active group
  const activeGroup = groups.find(g => g.id === activeGroupId)
  const filtersMatchActiveGroup = activeGroup &&
    activeGroup.searchQuery === searchQuery &&
    activeGroup.tags.length === selectedTags.length &&
    activeGroup.tags.every(t => selectedTags.includes(t)) &&
    JSON.stringify(activeGroup.recencyRange) === JSON.stringify(recencyRange)

  const { stats, isProcessing, resetStuckJobs, triggerProcessing } = useExtractionStatus()

  // Filter tags by search, with selected tags at top
  const filteredTags = useMemo(() => {
    let result = tags
    if (tagSearch) {
      const search = tagSearch.toLowerCase()
      result = result.filter(tag => tag.toLowerCase().includes(search))
    }
    // Sort: selected tags first, then alphabetically
    return result.sort((a, b) => {
      const aSelected = selectedTags.includes(a)
      const bSelected = selectedTags.includes(b)
      if (aSelected && !bSelected) return -1
      if (!aSelected && bSelected) return 1
      return a.localeCompare(b)
    })
  }, [tags, tagSearch, selectedTags])

  // Check if any filters are active
  const hasActiveFilters = selectedTags.length > 0 || recencyRange !== null || searchQuery

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleCreateGroup = () => {
    if (!groupName.trim()) return
    onCreateGroup({
      name: groupName.trim(),
      tags: selectedTags,
      recencyRange,
      searchQuery
    })
    setGroupName('')
    setShowCreateGroup(false)
  }

  const handleClearFilters = () => {
    selectedTags.forEach(tag => onTagToggle(tag))
    onRecencyRangeChange(null)
    onSearchChange('')
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

  // Focus search on expand
  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchExpanded])

  return (
    <div className="absolute top-20 left-4 right-4 z-20 flex flex-wrap items-start gap-4 pointer-events-none">
      {/* Compact search bar */}
      <div className="flex items-center gap-2 pointer-events-auto bg-background/90 backdrop-blur-sm p-2 rounded-lg border border-border shadow-sm">
        <div className={`relative transition-all duration-200 ${searchExpanded ? 'w-80' : 'w-8'}`}>
          {searchExpanded ? (
            <>
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
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onBlur={() => !searchQuery && setSearchExpanded(false)}
                className="w-full pl-10 pr-8"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setSearchExpanded(true)}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground"
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
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowPanel(!showPanel)}
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
            className="mr-1"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Settings
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear
          </Button>
        )}

        <Button variant="ghost" size="sm" onClick={onRefresh}>
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
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
        </Button>

        {/* Extraction Status Indicator */}
        {isProcessing && (
          <button
            onClick={() => {
              resetStuckJobs()
              setTimeout(triggerProcessing, 500)
            }}
            className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full hover:bg-yellow-500/20 transition-colors"
            title="Click to retry extraction"
          >
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              Extracting ({stats.pending + stats.processing})
            </span>
          </button>
        )}

        {stats.completed_today > 0 && !isProcessing && (
          <span className="text-xs text-muted-foreground">
            {stats.completed_today} notes today
          </span>
        )}
      </div>

      {/* Settings Panel with Accordions */}
      {showPanel && (
        <div className="w-full max-w-sm bg-background/95 backdrop-blur-sm border border-border rounded-lg pointer-events-auto shadow-lg overflow-hidden">
          {/* Groups Section */}
          <AccordionSection
            title="Groups"
            isOpen={openSections.groups}
            onToggle={() => toggleSection('groups')}
            badge={groups.length || undefined}
          >
            <div className="space-y-2">
              {groups.length > 0 ? (
                <div className="space-y-1">
                  {groups.map(group => {
                    const isActive = activeGroupId === group.id
                    const isEditing = editingGroupId === group.id
                    const needsUpdate = isActive && !filtersMatchActiveGroup

                    return (
                    <div
                      key={group.id}
                      draggable={!isEditing}
                      onDragStart={(e) => handleDragStart(e, group.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, group.id)}
                      className={`flex items-center gap-2 p-2 rounded border bg-background cursor-move ${
                        draggedGroupId === group.id ? 'opacity-50' : ''
                      } ${isActive ? 'border-foreground/50 bg-accent/20' : 'border-border hover:bg-accent/30'}`}
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
                          className="flex-1 text-sm bg-transparent border-b border-foreground/50 outline-none px-1"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="flex-1 text-sm truncate cursor-text"
                          onDoubleClick={() => {
                            setEditingGroupId(group.id)
                            setEditingName(group.name)
                          }}
                          title="Double-click to rename"
                        >
                          {group.name}
                        </span>
                      )}
                      {needsUpdate ? (
                        <button
                          onClick={() => {
                            onUpdateGroup(group.id, {
                              tags: selectedTags,
                              recencyRange,
                              searchQuery
                            })
                          }}
                          className="text-xs text-blue-500 hover:text-blue-400 px-1 font-medium"
                          title="Update group with current filters"
                        >
                          Update
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onApplyGroup(group)
                            setActiveGroupId(group.id)
                          }}
                          className={`text-xs px-1 ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                          title="Apply filter"
                        >
                          {isActive ? 'Active' : 'Apply'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onDeleteGroup(group.id)
                          if (activeGroupId === group.id) setActiveGroupId(null)
                        }}
                        className="text-muted-foreground hover:text-red-500"
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
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No groups yet. Create one from current filters.
                </p>
              )}

              {showCreateGroup ? (
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="text"
                    placeholder="Group name..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                    className="flex-1 h-8 text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleCreateGroup} disabled={!groupName.trim()}>
                    Save
                  </Button>
                  <button
                    onClick={() => {
                      setShowCreateGroup(false)
                      setGroupName('')
                    }}
                    className="text-muted-foreground hover:text-foreground"
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
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  + Create group from current filters
                </button>
              )}
            </div>
          </AccordionSection>

          {/* Physics Section */}
          <AccordionSection
            title="Physics"
            isOpen={openSections.physics}
            onToggle={() => toggleSection('physics')}
          >
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Center Force</label>
                  <span className="text-xs text-muted-foreground">{physics.centerForce.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={physics.centerForce}
                  onChange={(e) => onPhysicsChange({ centerForce: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-foreground"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Repel Force</label>
                  <span className="text-xs text-muted-foreground">{physics.repelForce}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={physics.repelForce}
                  onChange={(e) => onPhysicsChange({ repelForce: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-foreground"
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
                  className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-foreground"
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
                  className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-foreground"
                />
              </div>

              <button
                onClick={onResetPhysics}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Reset to defaults
              </button>
            </div>
          </AccordionSection>

          {/* Tags Section */}
          {tags.length > 0 && (
            <AccordionSection
              title="Tags"
              isOpen={openSections.tags}
              onToggle={() => toggleSection('tags')}
              badge={selectedTags.length || undefined}
            >
              <div className="space-y-2">
                {tags.length > 10 && (
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
                      placeholder="Search tags..."
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      className="w-full pl-9 h-8 text-sm"
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {filteredTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => onTagToggle(tag)}
                      className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-foreground text-background border-foreground'
                          : 'border-border hover:border-foreground'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                  {filteredTags.length === 0 && tagSearch && (
                    <span className="text-sm text-muted">No tags match &quot;{tagSearch}&quot;</span>
                  )}
                </div>
              </div>
            </AccordionSection>
          )}

          {/* Connections Section */}
          <AccordionSection
            title="Connections"
            isOpen={openSections.connections}
            onToggle={() => toggleSection('connections')}
            badge={selectedConnectionTypes.length > 0 && selectedConnectionTypes.length < CONNECTION_TYPES.length ? selectedConnectionTypes.length : undefined}
          >
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Show only specific connection types</p>
              <div className="space-y-1">
                {CONNECTION_TYPES.map(conn => {
                  const isSelected = selectedConnectionTypes.length === 0 || selectedConnectionTypes.includes(conn.type)
                  return (
                    <button
                      key={conn.type}
                      onClick={() => onConnectionTypeToggle(conn.type)}
                      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors ${
                        isSelected
                          ? 'bg-accent/50'
                          : 'opacity-40 hover:opacity-70'
                      }`}
                    >
                      <div
                        className="w-4 h-0.5 rounded"
                        style={{ backgroundColor: conn.color }}
                      />
                      <span>{conn.label}</span>
                      {conn.type === 'contradicts' && (
                        <span className="ml-auto text-xs text-muted-foreground">Find conflicts</span>
                      )}
                    </button>
                  )
                })}
              </div>
              {selectedConnectionTypes.length > 0 && (
                <button
                  onClick={() => {
                    // Clear all by toggling each selected one off
                    selectedConnectionTypes.forEach(t => onConnectionTypeToggle(t))
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Show all connections
                </button>
              )}
            </div>
          </AccordionSection>

          {/* Recency Section */}
          {totalNotes > 1 && (
            <AccordionSection
              title="Recency"
              isOpen={openSections.recency}
              onToggle={() => toggleSection('recency')}
              badge={recencyRange ? '1' : undefined}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Filter by note age</p>
                  {recencyRange && (
                    <button
                      onClick={() => onRecencyRangeChange(null)}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      Show all
                    </button>
                  )}
                </div>
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
        </div>
      )}
    </div>
  )
}
