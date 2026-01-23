'use client'

import Link from 'next/link'
import type { Document } from '@/types/document'

interface DocumentCardProps {
  document: Document
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}

export function DocumentCard({ document, onArchive, onDelete }: DocumentCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  const getPreview = (content: string) => {
    if (!content) return 'Empty document'
    const cleaned = content.replace(/\s+/g, ' ').trim()
    return cleaned.length > 120 ? cleaned.substring(0, 120) + '...' : cleaned
  }

  return (
    <div className="group relative bg-background border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors">
      <Link href={`/write/${document.id}`} className="block">
        <h3 className="font-medium mb-1 pr-8">
          {document.title || 'Untitled'}
        </h3>
        <p className="text-sm text-muted line-clamp-2 mb-3">
          {getPreview(document.content)}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>{document.word_count} words</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>Created {formatDate(document.created_at)}</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>Modified {formatDate(document.updated_at)}</span>
        </div>
      </Link>

      {/* Actions menu */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
            className="p-1 hover:bg-foreground/10 rounded"
            onClick={(e) => {
              e.preventDefault()
              const menu = e.currentTarget.nextElementSibling
              menu?.classList.toggle('hidden')
            }}
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
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
          <div className="hidden absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg py-1 min-w-32 z-10">
            <button
              onClick={() => onArchive(document.id)}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-foreground/5"
            >
              Archive
            </button>
            <button
              onClick={() => onDelete(document.id)}
              className="w-full px-3 py-1.5 text-left text-sm text-red-500 hover:bg-foreground/5"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
