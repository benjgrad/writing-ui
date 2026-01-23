'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { RangeSlider } from '@/components/ui/RangeSlider'
import { useExtractionStatus } from '@/hooks/useExtractionStatus'
import type { SavedFilter, RecencyRange } from '@/types/graph'

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
  savedFilters: SavedFilter[]
  onSaveFilter: (filter: Omit<SavedFilter, 'id'>) => void
  onDeleteFilter: (id: string) => void
  onApplyFilter: (filter: SavedFilter) => void
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
  savedFilters,
  onSaveFilter,
  onDeleteFilter,
  onApplyFilter
}: GraphControlsProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const [filterName, setFilterName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const { stats, isProcessing, resetStuckJobs, triggerProcessing } = useExtractionStatus()

  // Filter tags by search
  const filteredTags = useMemo(() => {
    if (!tagSearch) return tags
    const search = tagSearch.toLowerCase()
    return tags.filter(tag => tag.toLowerCase().includes(search))
  }, [tags, tagSearch])

  // Check if any filters are active
  const hasActiveFilters = selectedTags.length > 0 || recencyRange !== null || searchQuery

  const handleSaveFilter = () => {
    if (!filterName.trim()) return
    onSaveFilter({
      name: filterName.trim(),
      tags: selectedTags,
      recencyRange,
      searchQuery
    })
    setFilterName('')
    setShowSaveDialog(false)
  }

  const handleClearFilters = () => {
    selectedTags.forEach(tag => onTagToggle(tag))
    onRecencyRangeChange(null)
    onSearchChange('')
  }

  const handleRecencyChange = (start: number, end: number) => {
    // If range covers everything (0-100), treat as no filter
    if (start === 0 && end === 100) {
      onRecencyRangeChange(null)
    } else {
      onRecencyRangeChange({ start, end })
    }
  }

  // Format label to show note count
  const formatRecencyLabel = (percent: number, total: number) => {
    const noteIndex = Math.round((percent / 100) * totalNotes)
    return `${noteIndex}`
  }

  return (
    <div className="absolute top-20 left-4 right-4 z-20 flex flex-wrap items-start gap-4 pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto bg-background/90 backdrop-blur-sm p-2 rounded-lg border border-border shadow-sm">
        <div className="relative">
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
            type="text"
            placeholder="Search notes by title or content..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-80 pl-10"
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
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters {hasActiveFilters && `(${selectedTags.length + (recencyRange ? 1 : 0)})`}
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
              Extracting knowledge ({stats.pending + stats.processing})
            </span>
          </button>
        )}

        {stats.completed_today > 0 && !isProcessing && (
          <span className="text-xs text-muted-foreground">
            {stats.completed_today} notes extracted today
          </span>
        )}
      </div>

      {showFilters && (
        <div className="w-full bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 pointer-events-auto shadow-sm space-y-4">
          {/* Recency Range Filter */}
          {totalNotes > 1 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Recency</p>
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
                formatLabel={formatRecencyLabel}
                className="w-full max-w-md"
              />
            </div>
          )}

          {/* Tag Filter with Search */}
          {tags.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Filter by tag</p>
              {tags.length > 10 && (
                <div className="relative mb-2">
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
                    className="w-48 pl-9 h-8 text-sm"
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
          )}

          {/* Saved Filters */}
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Saved Filters</p>
              {hasActiveFilters && !showSaveDialog && (
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="text-xs text-muted hover:text-foreground"
                >
                  Save current filter
                </button>
              )}
            </div>

            {showSaveDialog && (
              <div className="flex items-center gap-2 mb-2">
                <Input
                  type="text"
                  placeholder="Filter name..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
                  className="w-48 h-8 text-sm"
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveFilter} disabled={!filterName.trim()}>
                  Save
                </Button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false)
                    setFilterName('')
                  }}
                  className="text-muted hover:text-foreground"
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
            )}

            {savedFilters.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {savedFilters.map(filter => (
                  <div
                    key={filter.id}
                    className="flex items-center gap-1 px-2 py-1 bg-foreground/5 rounded-full border border-border group"
                  >
                    <button
                      onClick={() => onApplyFilter(filter)}
                      className="text-xs hover:text-foreground"
                    >
                      {filter.name}
                    </button>
                    <button
                      onClick={() => onDeleteFilter(filter.id)}
                      className="text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
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
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-muted">
                {hasActiveFilters ? 'Save your current filter for quick access' : 'No saved filters yet'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
