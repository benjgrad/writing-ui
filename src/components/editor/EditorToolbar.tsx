'use client'

import Link from 'next/link'

interface EditorToolbarProps {
  title: string
  onTitleChange: (title: string) => void
  isSaving: boolean
  lastSaved: Date | null
  wordCount: number
  error?: string | null
}

export function EditorToolbar({
  title,
  onTitleChange,
  isSaving,
  lastSaved,
  wordCount,
  error
}: EditorToolbarProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 bg-background/80 backdrop-blur-sm border-b border-border z-50">
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
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled"
          className="bg-transparent border-none text-lg font-medium focus:outline-none w-48 md:w-64"
        />
      </div>

      <div className="flex items-center gap-4 text-sm text-muted">
        <span>{wordCount} words</span>
        <span className="w-px h-4 bg-border" />
        {error ? (
          <span className="text-red-500 flex items-center gap-1">
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
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Save failed
          </span>
        ) : isSaving ? (
          <span className="flex items-center gap-1">
            <span className="animate-pulse">Saving...</span>
          </span>
        ) : lastSaved ? (
          <span>Saved at {formatTime(lastSaved)}</span>
        ) : (
          <span>Not saved yet</span>
        )}
        <span className="w-px h-4 bg-border" />
        {/* Navigation icons */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="p-1.5 text-muted hover:text-foreground transition-colors rounded hover:bg-foreground/5"
            title="Documents"
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </Link>
          <Link
            href="/graph"
            className="p-1.5 text-muted hover:text-foreground transition-colors rounded hover:bg-foreground/5"
            title="Knowledge Graph"
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
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
