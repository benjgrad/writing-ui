'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useDocuments } from '@/hooks/useDocuments'
import { DocumentList } from '@/components/documents/DocumentList'
import { SearchBar } from '@/components/documents/SearchBar'
import { CreateDocumentButton } from '@/components/documents/CreateDocumentButton'
import { Loading } from '@/components/ui/Loading'
import { Button } from '@/components/ui/Button'

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { documents, loading, archiveDocument, deleteDocument, searchDocuments } = useDocuments()
  const [searchQuery, setSearchQuery] = useState('')

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
          <h1 className="text-lg font-semibold">Writing</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/graph"
              className="text-sm text-muted hover:text-foreground transition-colors flex items-center gap-1.5"
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
                <circle cx="12" cy="12" r="3" />
                <circle cx="4" cy="6" r="2" />
                <circle cx="20" cy="6" r="2" />
                <circle cx="4" cy="18" r="2" />
                <circle cx="20" cy="18" r="2" />
                <line x1="6" y1="6" x2="9" y2="10" />
                <line x1="15" y1="10" x2="18" y2="6" />
                <line x1="6" y1="18" x2="9" y2="14" />
                <line x1="15" y1="14" x2="18" y2="18" />
              </svg>
              Graph
            </Link>
            <span className="text-sm text-muted">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
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
          <div className="w-full sm:w-80">
            <SearchBar onSearch={handleSearch} />
          </div>
          <CreateDocumentButton />
        </div>

        {/* Document list */}
        <DocumentList
          documents={documents}
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
