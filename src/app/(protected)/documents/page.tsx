'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useDocuments } from '@/hooks/useDocuments'
import { DocumentList } from '@/components/documents/DocumentList'
import { SearchBar } from '@/components/documents/SearchBar'
import { CreateDocumentButton } from '@/components/documents/CreateDocumentButton'
import { Loading } from '@/components/ui/Loading'

type SortOption = 'modified' | 'created' | 'title'

export default function DocumentsPage() {
  const { loading: authLoading } = useAuth()
  const { documents, loading, archiveDocument, deleteDocument, searchDocuments } = useDocuments()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('modified')

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    searchDocuments(query)
  }, [searchDocuments])

  const handleArchive = useCallback(async (id: string) => {
    await archiveDocument(id)
  }, [archiveDocument])

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to delete this document? This cannot be undone.')) {
      await deleteDocument(id)
    }
  }, [deleteDocument])

  // Calculate stats
  const stats = useMemo(() => {
    const totalWords = documents.reduce((sum, doc) => sum + doc.word_count, 0)
    const totalDocs = documents.length
    return { totalWords, totalDocs }
  }, [documents])

  // Sort documents
  const sortedDocuments = useMemo(() => {
    const sorted = [...documents]
    switch (sortBy) {
      case 'modified':
        sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        break
      case 'created':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'title':
        sorted.sort((a, b) => (a.title || 'Untitled').localeCompare(b.title || 'Untitled'))
        break
    }
    return sorted
  }, [documents, sortBy])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-muted hover:text-foreground transition-colors"
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
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold">Documents</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="flex gap-6 mb-8">
          <div>
            <p className="text-2xl font-semibold">{stats.totalDocs}</p>
            <p className="text-sm text-muted">Documents</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.totalWords.toLocaleString()}</p>
            <p className="text-sm text-muted">Total words</p>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-8">
          <div className="flex gap-4 items-center">
            <div className="w-full sm:w-80">
              <SearchBar onSearch={handleSearch} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted whitespace-nowrap">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-foreground/20"
              >
                <option value="modified">Date modified</option>
                <option value="created">Date created</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>
          <CreateDocumentButton />
        </div>

        {/* Document list */}
        <DocumentList
          documents={sortedDocuments}
          loading={loading}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />

        {/* Search results indicator */}
        {searchQuery && (
          <p className="mt-4 text-sm text-muted">
            Showing results for &ldquo;{searchQuery}&rdquo;
          </p>
        )}
      </main>
    </div>
  )
}
