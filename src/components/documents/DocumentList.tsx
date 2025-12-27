'use client'

import type { Document } from '@/types/document'
import { DocumentCard } from './DocumentCard'
import { Loading } from '@/components/ui/Loading'

interface DocumentListProps {
  documents: Document[]
  loading: boolean
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}

export function DocumentList({ documents, loading, onArchive, onDelete }: DocumentListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loading />
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">No documents yet</p>
        <p className="text-sm text-muted mt-1">
          Create your first document to get started
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map(doc => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
