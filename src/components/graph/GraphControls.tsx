'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useExtractionStatus } from '@/hooks/useExtractionStatus'

interface GraphControlsProps {
  tags: string[]
  selectedTags: string[]
  onTagToggle: (tag: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onRefresh: () => void
}

export function GraphControls({
  tags,
  selectedTags,
  onTagToggle,
  searchQuery,
  onSearchChange,
  onRefresh
}: GraphControlsProps) {
  const [showFilters, setShowFilters] = useState(false)
  const { stats, isProcessing } = useExtractionStatus()

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
          Filters {selectedTags.length > 0 && `(${selectedTags.length})`}
        </Button>
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
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              Extracting knowledge ({stats.pending + stats.processing})
            </span>
          </div>
        )}

        {stats.completed_today > 0 && !isProcessing && (
          <span className="text-xs text-muted-foreground">
            {stats.completed_today} notes extracted today
          </span>
        )}
      </div>

      {showFilters && tags.length > 0 && (
        <div className="w-full bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 pointer-events-auto shadow-sm">
          <p className="text-sm font-medium mb-2">Filter by tag</p>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
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
          </div>
        </div>
      )}
    </div>
  )
}
