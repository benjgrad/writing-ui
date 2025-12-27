'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useFadingText } from '@/hooks/useFadingText'
import { useAutoSave } from '@/hooks/useAutoSave'
import { FadingWord } from './FadingWord'
import { ContinuationPrompt } from './ContinuationPrompt'
import { EditorToolbar } from './EditorToolbar'
import type { WordWithTimestamp, Document } from '@/types/document'

interface FadingEditorProps {
  userId: string
  initialDocument?: Document | null
}

export function FadingEditor({ userId, initialDocument }: FadingEditorProps) {
  const [title, setTitle] = useState(initialDocument?.title || 'Untitled')
  const [inputValue, setInputValue] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const [aiPrompt, setAiPrompt] = useState<string | null>(null)
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const promptFetchedRef = useRef(false)

  const initialWords = initialDocument?.content_with_timestamps as WordWithTimestamp[] || []

  const {
    words,
    fadedIds,
    syncWords,
    allFaded,
    rawContent
  } = useFadingText(initialWords)

  const {
    isSaving,
    lastSaved,
    error: saveError,
    debouncedSave
  } = useAutoSave({
    documentId: initialDocument?.id || null,
    userId
  })

  // Initialize with existing content
  useEffect(() => {
    if (initialDocument?.content) {
      setInputValue(initialDocument.content)
      syncWords(initialDocument.content)
    }
  }, [initialDocument, syncWords])

  // Fetch AI prompt when all text has faded
  useEffect(() => {
    if (allFaded && !promptFetchedRef.current && words.length > 0) {
      promptFetchedRef.current = true
      setIsLoadingPrompt(true)
      setShowPrompt(true)

      fetch('/api/ai/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: rawContent })
      })
        .then(res => res.json())
        .then(data => {
          setAiPrompt(data.prompt)
        })
        .catch(() => {
          setAiPrompt("What comes next?")
        })
        .finally(() => {
          setIsLoadingPrompt(false)
        })
    }
  }, [allFaded, words.length, rawContent])

  // Reset prompt state when user starts typing again
  const handleDismissPrompt = useCallback(() => {
    setShowPrompt(false)
    textareaRef.current?.focus()
  }, [])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // Reset prompt state if user starts typing
    if (showPrompt) {
      setShowPrompt(false)
      promptFetchedRef.current = false
      setAiPrompt(null)
    }

    // Sync words when text changes
    syncWords(newValue)

    // Auto-save
    const currentWords = newValue.split(/\s+/).filter(Boolean).map((word, index) => ({
      id: `${index}-${word}`,
      word,
      typedAt: Date.now()
    }))
    debouncedSave(newValue, currentWords, title)
  }, [syncWords, debouncedSave, title, showPrompt])

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle)
    debouncedSave(inputValue, words, newTitle)
  }, [debouncedSave, inputValue, words])

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const wordCount = inputValue.split(/\s+/).filter(Boolean).length

  return (
    <div className="min-h-screen bg-background">
      <EditorToolbar
        title={title}
        onTitleChange={handleTitleChange}
        isSaving={isSaving}
        lastSaved={lastSaved}
        wordCount={wordCount}
        error={saveError}
      />

      <div className="pt-14 min-h-screen relative">
        {/* Fading words overlay */}
        <div
          className="absolute inset-0 pt-8 px-4 md:px-8 lg:px-16 pointer-events-none"
          aria-hidden="true"
        >
          <div className="max-w-3xl mx-auto text-xl md:text-2xl leading-relaxed">
            {words.map((word) => (
              <FadingWord
                key={word.id}
                word={word.word}
                isFaded={fadedIds.has(word.id)}
              />
            ))}
          </div>
        </div>

        {/* Actual textarea (invisible but captures input) */}
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInput}
          className="w-full min-h-[calc(100vh-3.5rem)] pt-8 px-4 md:px-8 lg:px-16 bg-transparent text-xl md:text-2xl leading-relaxed resize-none focus:outline-none text-transparent caret-foreground selection:bg-foreground/10"
          placeholder="Start writing..."
          style={{ caretColor: 'var(--foreground)' }}
        />

        {/* AI continuation prompt */}
        {showPrompt && (
          <ContinuationPrompt
            prompt={aiPrompt}
            isLoading={isLoadingPrompt}
            onDismiss={handleDismissPrompt}
          />
        )}
      </div>
    </div>
  )
}
