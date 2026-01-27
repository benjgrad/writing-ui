'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { openCoachingSession } from '@/components/coaching/CoachingProvider'
import { Tooltip } from '@/components/ui/Tooltip'
import type { GraphNode } from '@/types/graph'

interface NotePanelProps {
  node: GraphNode
  onClose: () => void
  onDelete?: () => void
  onTagsChange?: () => void
  allTags?: string[]
}

export function NotePanel({ node, onClose, onDelete, onTagsChange, allTags = [] }: NotePanelProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [nodeTags, setNodeTags] = useState<string[]>(node.tags)
  const [isEditingTags, setIsEditingTags] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const [isAddingTag, setIsAddingTag] = useState(false)
  const supabase = createClient()

  // Update local tags when node changes
  useEffect(() => {
    setNodeTags(node.tags)
  }, [node.tags])

  // Filter available tags (exclude already added ones)
  const availableTags = useMemo(() => {
    const currentTags = new Set(nodeTags)
    let tags = allTags.filter(t => !currentTags.has(t))
    if (tagSearch) {
      const search = tagSearch.toLowerCase()
      tags = tags.filter(t => t.toLowerCase().includes(search))
    }
    return tags.slice(0, 10) // Limit to 10 suggestions
  }, [allTags, nodeTags, tagSearch])

  // Check if search matches any existing tag
  const searchMatchesExisting = useMemo(() => {
    if (!tagSearch) return false
    const search = tagSearch.toLowerCase()
    return allTags.some(t => t.toLowerCase() === search) || nodeTags.some(t => t.toLowerCase() === search)
  }, [tagSearch, allTags, nodeTags])

  const handleAddTag = async (tagName: string) => {
    if (!tagName.trim() || isAddingTag) return
    setIsAddingTag(true)

    try {
      // Get or create the tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let { data: existingTag } = await (supabase as any)
        .from('tags')
        .select('id')
        .eq('name', tagName.trim())
        .single()

      let tagId = existingTag?.id

      if (!tagId) {
        // Create new tag
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newTag, error: createError } = await (supabase as any)
          .from('tags')
          .insert({ name: tagName.trim() })
          .select('id')
          .single()

        if (createError) throw createError
        tagId = newTag.id
      }

      // Add tag to note
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: linkError } = await (supabase as any)
        .from('note_tags')
        .insert({ note_id: node.id, tag_id: tagId })

      if (linkError && !linkError.message?.includes('duplicate')) {
        throw linkError
      }

      // Update local state
      setNodeTags(prev => [...prev, tagName.trim()])
      setTagSearch('')
      setNewTagName('')
      onTagsChange?.()
    } catch (err) {
      console.error('Error adding tag:', err)
    } finally {
      setIsAddingTag(false)
    }
  }

  const handleRemoveTag = async (tagName: string) => {
    try {
      // Get tag ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tag } = await (supabase as any)
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .single()

      if (!tag) return

      // Remove tag from note
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('note_tags')
        .delete()
        .eq('note_id', node.id)
        .eq('tag_id', tag.id)

      // Update local state
      setNodeTags(prev => prev.filter(t => t !== tagName))
      onTagsChange?.()
    } catch (err) {
      console.error('Error removing tag:', err)
    }
  }

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
  // NVQ score color based on passing threshold (7)
  const getNVQColor = (score?: number) => {
    if (score === undefined) return 'bg-gray-500/10 text-gray-500'
    if (score >= 7) return 'bg-emerald-500/10 text-emerald-500'
    if (score >= 5) return 'bg-amber-500/10 text-amber-500'
    return 'bg-red-500/10 text-red-500'
  }

  // Note status colors (Seed -> Evergreen growth metaphor)
  const getStatusColor = (status?: string) => {
    const colors: Record<string, string> = {
      Seed: 'bg-yellow-500/10 text-yellow-600',
      Sapling: 'bg-lime-500/10 text-lime-600',
      Evergreen: 'bg-emerald-500/10 text-emerald-600'
    }
    return colors[status || ''] || 'bg-gray-500/10 text-gray-500'
  }

  // Note content type colors
  const getContentTypeColor = (type?: string) => {
    const colors: Record<string, string> = {
      Logic: 'bg-blue-500/10 text-blue-500',
      Technical: 'bg-purple-500/10 text-purple-500',
      Reflection: 'bg-pink-500/10 text-pink-500'
    }
    return colors[type || ''] || 'bg-gray-500/10 text-gray-500'
  }

  // Stakeholder colors
  const getStakeholderColor = (stakeholder?: string) => {
    const colors: Record<string, string> = {
      Self: 'bg-cyan-500/10 text-cyan-600',
      'Future Users': 'bg-indigo-500/10 text-indigo-600',
      'AI Agent': 'bg-violet-500/10 text-violet-600'
    }
    return colors[stakeholder || ''] || 'bg-gray-500/10 text-gray-500'
  }

  // Legacy type label (fallback for notes without NVQ data)
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

  // Check if note has NVQ metadata
  const hasNVQData = node.nvqScore !== undefined

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

        {/* NVQ Metadata Badges */}
        {hasNVQData ? (
          <div className="flex flex-wrap gap-1.5">
            {/* NVQ Score */}
            <Tooltip content="Note Vitality Quotient: Quality score (0-10) measuring purpose, metadata, taxonomy, connectivity, and originality. 7+ is passing.">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full cursor-help ${getNVQColor(node.nvqScore)}`}>
                <span className="font-medium">NVQ</span>
                <span>{node.nvqScore?.toFixed(1)}/10</span>
              </span>
            </Tooltip>
            {/* Note Status (Seed/Sapling/Evergreen) */}
            {node.noteStatus && (
              <Tooltip
                content={
                  node.noteStatus === 'Seed' ? 'Seed: Raw information or early-stage idea, needs development' :
                  node.noteStatus === 'Sapling' ? 'Sapling: Synthesized insight, growing through connections' :
                  'Evergreen: Fundamental truth or principle that remains valid over time'
                }
              >
                <span className={`inline-block px-2 py-0.5 text-xs rounded-full cursor-help ${getStatusColor(node.noteStatus)}`}>
                  {node.noteStatus}
                </span>
              </Tooltip>
            )}
            {/* Content Type (Logic/Technical/Reflection) */}
            {node.noteContentType && (
              <Tooltip
                content={
                  node.noteContentType === 'Logic' ? 'Logic: Reasoning, decision-making, or "why" explanations' :
                  node.noteContentType === 'Technical' ? 'Technical: How-to guides, procedures, or implementation details' :
                  'Reflection: Personal observations, lessons learned, or self-insights'
                }
              >
                <span className={`inline-block px-2 py-0.5 text-xs rounded-full cursor-help ${getContentTypeColor(node.noteContentType)}`}>
                  {node.noteContentType}
                </span>
              </Tooltip>
            )}
            {/* Stakeholder */}
            {node.stakeholder && (
              <Tooltip content={`Stakeholder: Who benefits from this note - ${node.stakeholder}`}>
                <span className={`inline-block px-2 py-0.5 text-xs rounded-full cursor-help ${getStakeholderColor(node.stakeholder)}`}>
                  {node.stakeholder}
                </span>
              </Tooltip>
            )}
          </div>
        ) : (
          <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getTypeColor(node.type)}`}>
            {getTypeLabel(node.type)}
          </span>
        )}

        {/* Purpose Statement */}
        {node.purposeStatement && (
          <div className="mt-3 p-2 bg-foreground/5 rounded-md border-l-2 border-blue-500/50">
            <p className="text-xs text-muted-foreground mb-1">Purpose</p>
            <p className="text-sm text-foreground/80 italic leading-relaxed">
              {node.purposeStatement}
            </p>
          </div>
        )}

        {/* Project Link */}
        {node.projectLink && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>{node.projectLink}</span>
          </div>
        )}

        <div className="mt-4">
          <p className="text-sm text-foreground/80 leading-relaxed">
            {node.content}
          </p>
        </div>

        {/* Tags section - always show for editing */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted">Tags</p>
            <button
              onClick={() => setIsEditingTags(!isEditingTags)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {isEditingTags ? 'Done' : 'Edit'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1">
            {nodeTags.map(tag => (
              <span
                key={tag}
                className={`px-2 py-0.5 text-xs bg-foreground/5 rounded-full flex items-center gap-1 ${
                  isEditingTags ? 'pr-1' : ''
                }`}
              >
                #{tag}
                {isEditingTags && (
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="w-3.5 h-3.5 rounded-full bg-foreground/10 hover:bg-red-500/20 hover:text-red-500 flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </span>
            ))}
            {nodeTags.length === 0 && !isEditingTags && (
              <span className="text-xs text-muted-foreground">No tags</span>
            )}
          </div>

          {/* Tag editing UI */}
          {isEditingTags && (
            <div className="mt-2 space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagSearch.trim()) {
                      e.preventDefault()
                      handleAddTag(tagSearch.trim())
                    }
                  }}
                  placeholder="Search or create tag..."
                  className="w-full px-3 py-1.5 text-sm bg-foreground/5 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-foreground/20"
                  disabled={isAddingTag}
                />
                {isAddingTag && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground/60 rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Tag suggestions */}
              {tagSearch && (
                <div className="space-y-1">
                  {/* Create new tag option */}
                  {!searchMatchesExisting && (
                    <button
                      onClick={() => handleAddTag(tagSearch.trim())}
                      disabled={isAddingTag}
                      className="w-full text-left px-2 py-1 text-xs rounded hover:bg-foreground/5 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Create &quot;{tagSearch.trim()}&quot;
                    </button>
                  )}

                  {/* Existing tag suggestions */}
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleAddTag(tag)}
                      disabled={isAddingTag}
                      className="w-full text-left px-2 py-1 text-xs rounded hover:bg-foreground/5"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Quick add from existing tags when not searching */}
              {!tagSearch && availableTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {availableTags.slice(0, 5).map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleAddTag(tag)}
                      disabled={isAddingTag}
                      className="px-2 py-0.5 text-xs border border-dashed border-border rounded-full hover:border-foreground/50 hover:bg-foreground/5"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
