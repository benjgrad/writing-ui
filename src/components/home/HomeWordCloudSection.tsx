'use client'

import { useState } from 'react'
import { useWordCloudData } from '@/hooks/useWordCloudData'
import { WordCloud } from '@/components/word-cloud/WordCloud'
import { Loading } from '@/components/ui/Loading'

export function HomeWordCloudSection() {
  const {
    items,
    hiddenWords,
    loading,
    error,
    hideWord,
    unhideWord,
    clearHiddenWords
  } = useWordCloudData()

  const [showHiddenManager, setShowHiddenManager] = useState(false)

  if (loading) {
    return (
      <div className="py-6 flex items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-6 text-center">
        <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-background rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <h3 className="font-medium text-foreground">Your Topics</h3>
          {items.length > 0 && (
            <span className="text-xs text-muted">
              {items.length} topic{items.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {hiddenWords.length > 0 && (
          <button
            onClick={() => setShowHiddenManager(!showHiddenManager)}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            {showHiddenManager ? 'Hide' : `${hiddenWords.length} hidden`}
          </button>
        )}
      </div>

      {/* Hidden words manager */}
      {showHiddenManager && hiddenWords.length > 0 && (
        <div className="px-4 py-3 bg-foreground/[0.02] border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">Hidden words</span>
            <button
              onClick={clearHiddenWords}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              Restore all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hiddenWords.map(word => (
              <button
                key={word}
                onClick={() => unhideWord(word)}
                className="px-2 py-0.5 text-xs rounded-full border border-border hover:border-foreground transition-colors flex items-center gap-1"
              >
                <span>{word}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
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
            ))}
          </div>
        </div>
      )}

      {/* Word cloud */}
      <WordCloud items={items} onHideWord={hideWord} />
    </div>
  )
}
