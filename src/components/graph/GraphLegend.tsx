'use client'

import { useState } from 'react'
import type { GraphGroup } from '@/types/graph'

interface GraphLegendProps {
  groups: GraphGroup[]
}

const LINK_TYPES = [
  { type: 'related', color: '#9ca3af', label: 'Related' },
  { type: 'supports', color: '#22c55e', label: 'Supports' },
  { type: 'contradicts', color: '#ef4444', label: 'Contradicts' },
  { type: 'extends', color: '#8b5cf6', label: 'Extends' },
  { type: 'example_of', color: '#f59e0b', label: 'Example of' }
]

export function GraphLegend({ groups }: GraphLegendProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Sort groups by order
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order)

  return (
    <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-sm overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent/50 transition-colors"
        >
          <span>Legend</span>
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

        {isExpanded && (
          <div className="px-3 pb-3 space-y-3 max-h-80 overflow-y-auto">
            {/* Groups Section */}
            {sortedGroups.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Groups</p>
                <div className="space-y-1">
                  {sortedGroups.map((group, index) => (
                    <div key={group.id} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="text-xs truncate max-w-35" title={group.name}>
                        {index + 1}. {group.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ungrouped indicator */}
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: '#6b7280' }}
              />
              <span className="text-xs text-muted-foreground">Ungrouped</span>
            </div>

            {/* Link Types Section */}
            <div className="border-t border-border pt-2">
              <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Connections</p>
              <div className="space-y-1">
                {LINK_TYPES.map(link => (
                  <div key={link.type} className="flex items-center gap-2">
                    <div className="w-4 flex items-center">
                      <div
                        className="w-full h-0.5"
                        style={{ backgroundColor: link.color }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{link.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
