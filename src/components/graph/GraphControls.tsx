'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

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

  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-start gap-4">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-64"
        />
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
      </div>

      {showFilters && tags.length > 0 && (
        <div className="w-full bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3">
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
