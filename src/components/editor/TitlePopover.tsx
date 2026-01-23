'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface TitlePopoverProps {
  title: string
  onTitleChange: (title: string) => void
  onRequestAIRename: () => void
  isAIGenerating: boolean
  onOpenChange?: (isOpen: boolean) => void
}

export function TitlePopover({
  title,
  onTitleChange,
  onRequestAIRename,
  isAIGenerating,
  onOpenChange,
}: TitlePopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editValue, setEditValue] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Sync editValue when title changes externally (e.g., AI rename)
  // Always sync when title changes to reflect AI-generated titles
  useEffect(() => {
    setEditValue(title)
  }, [title])

  // Focus input when popover opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isOpen])

  // Notify parent of open state changes
  useEffect(() => {
    onOpenChange?.(isOpen)
  }, [isOpen, onOpenChange])

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        handleSave()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, editValue])

  const handleOpen = useCallback(() => {
    setEditValue(title)
    setIsOpen(true)
  }, [title])

  const handleSave = useCallback(() => {
    const trimmedValue = editValue.trim()
    if (trimmedValue && trimmedValue !== title) {
      onTitleChange(trimmedValue)
    }
    setIsOpen(false)
  }, [editValue, title, onTitleChange])

  const handleCancel = useCallback(() => {
    setEditValue(title)
    setIsOpen(false)
  }, [title])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    },
    [handleSave, handleCancel]
  )

  const handleAIRename = useCallback(() => {
    onRequestAIRename()
  }, [onRequestAIRename])

  const displayTitle = title || 'Untitled'

  return (
    <div className="relative">
      {/* Clickable title display */}
      <button
        onClick={handleOpen}
        className="text-lg font-medium text-foreground hover:text-foreground/80 transition-colors truncate max-w-48 md:max-w-64 text-left"
        title="Click to rename"
      >
        {displayTitle}
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" aria-hidden="true" />

          {/* Popover content */}
          <div
            ref={popoverRef}
            className="absolute top-full left-0 mt-2 z-50 bg-background border border-border rounded-lg shadow-lg p-3 min-w-72"
          >
            <div className="flex flex-col gap-3">
              {/* Input field */}
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Document title"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleAIRename}
                  disabled={isAIGenerating}
                  className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {isAIGenerating ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      {/* Sparkle icon */}
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
                        <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
                      </svg>
                      Generate with AI
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-sm text-muted hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Hint */}
              <p className="text-xs text-muted">
                Press Enter to save, Escape to cancel
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
