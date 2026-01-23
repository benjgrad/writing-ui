'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { openCoachingSession } from '@/components/coaching/CoachingProvider'
import type { GraphNode } from '@/types/graph'

interface NotePanelProps {
  node: GraphNode
  onClose: () => void
  onDelete?: () => void
}

export function NotePanel({ node, onClose, onDelete }: NotePanelProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const supabase = createClient()

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      // Delete the note (cascades to note_tags and note_connections)
      const { error } = await supabase
        .from('atomic_notes')
        .delete()
        .eq('id', node.id)

      if (error) throw error

      onClose()
      onDelete?.()
    } catch (err) {
      console.error('Error deleting note:', err)
      alert('Failed to delete note')
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }
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
    <div className="absolute right-0 top-14 bottom-0 w-96 bg-background border-l border-border overflow-y-auto z-20">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold leading-tight break-words flex-1 pr-2">{node.title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-foreground/10 rounded flex-shrink-0"
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

        {/* Source references */}
        {node.sources && node.sources.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted mb-2">Sources</p>
            <div className="space-y-1">
              {node.sources.map(source => (
                source.source_type === 'document' ? (
                  <Link
                    key={source.id}
                    href={`/write/${source.source_id}`}
                    className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
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
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14,2 14,8 20,8" />
                    </svg>
                    <span className="truncate">
                      {source.document_title || 'Document'}
                    </span>
                  </Link>
                ) : (
                  <button
                    key={source.id}
                    onClick={() => openCoachingSession(source.source_id)}
                    className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors w-full text-left"
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
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="truncate">
                      {source.session_goal_title || 'Coaching Session'}
                    </span>
                  </button>
                )
              ))}
            </div>
          </div>
        )}

        {/* Delete section */}
        <div className="mt-6 pt-4 border-t border-border">
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-sm text-red-500 hover:text-red-400 transition-colors"
            >
              Delete note
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted">Delete this note?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isDeleting}
                  className="px-3 py-1 text-sm border border-border rounded hover:bg-foreground/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
