'use client'

import type { GraphNode } from '@/types/graph'

interface NotePanelProps {
  node: GraphNode
  onClose: () => void
}

export function NotePanel({ node, onClose }: NotePanelProps) {
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      permanent: 'Permanent Note',
      fleeting: 'Fleeting Note',
      literature: 'Literature Note'
    }
    return labels[type] || 'Note'
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      permanent: 'bg-blue-500/10 text-blue-500',
      fleeting: 'bg-amber-500/10 text-amber-500',
      literature: 'bg-emerald-500/10 text-emerald-500'
    }
    return colors[type] || 'bg-gray-500/10 text-gray-500'
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-background border-l border-border overflow-y-auto z-20">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold">{node.title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-foreground/10 rounded"
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getTypeColor(node.type)}`}>
          {getTypeLabel(node.type)}
        </span>

        <div className="mt-4">
          <p className="text-sm text-foreground/80 leading-relaxed">
            {node.content}
          </p>
        </div>

        {node.tags.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted mb-2">Tags</p>
            <div className="flex flex-wrap gap-1">
              {node.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-foreground/5 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
