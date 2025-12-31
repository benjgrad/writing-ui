'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useKeyboardCapture } from '@/hooks/useKeyboardCapture'
import { useCharacterBuffer } from '@/hooks/useCharacterBuffer'
import { useWordFading } from '@/hooks/useWordFading'
import { useLineManager } from '@/hooks/useLineManager'
import { useScrollBehavior } from '@/hooks/useScrollBehavior'
import { useAutoSave } from '@/hooks/useAutoSave'
import { WritingLine } from './WritingLine'
import { HistoryView } from './HistoryView'
import { IdlePrompt } from './IdlePrompt'
import { EditorToolbar } from './EditorToolbar'
import type { Document, WordWithTimestamp } from '@/types/document'

interface DreamEditorProps {
  userId: string
  initialDocument?: Document | null
}

export function DreamEditor({ userId, initialDocument }: DreamEditorProps) {
  const [title, setTitle] = useState(initialDocument?.title || 'Untitled')
  const [showPrompt, setShowPrompt] = useState(true) // Show prompt on load
  const [aiPrompt, setAiPrompt] = useState<string | null>(null)
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const promptFetchedRef = useRef(false)
  const editorZoneTop = typeof window !== 'undefined' ? window.innerHeight * 0.3 : 300

  // Character/word/line state management
  const {
    lines,
    currentLineIndex,
    addCharacter,
    addNewLine,
    deleteCharacter,
    fullContent,
    allWords,
    recentCharIds,
  } = useCharacterBuffer()

  // Word fading (30-second timers)
  const {
    isWordFading,
    isWordFaded,
    allFaded,
    fadedWords,
  } = useWordFading({ words: allWords, enabled: true })

  // Line positioning
  const { containerStyle, registerLineHeight } = useLineManager({
    lines,
    currentLineIndex,
    enabled: true,
  })

  // Auto-save
  const {
    isSaving,
    lastSaved,
    error: saveError,
    debouncedSave,
  } = useAutoSave({
    documentId: initialDocument?.id || null,
    userId,
  })

  // Get history content from faded words
  const historyContent = useMemo(() => {
    // For initial load, use the stored content
    if (initialDocument?.content) {
      return initialDocument.content
    }
    // Otherwise build from faded words
    return fadedWords
      .map((w) => w.characters.map((c) => c.char).join(''))
      .join('')
  }, [fadedWords, initialDocument?.content])

  // Track if we have history content
  const hasHistory = Boolean(historyContent || initialDocument?.content)

  // Scroll behavior for history
  const {
    promptOpacity,
    editorOpacity,
    historyOpacity,
    scrollToEditor,
    handleKeyboardInput,
    updateHistoryHeight,
    isInEditor,
  } = useScrollBehavior({
    containerRef,
    editorZoneTop,
    hasHistory,
    enabled: true,
  })

  // Handle character input
  const handleCharacter = useCallback(
    (char: string) => {
      // Dismiss prompt and scroll to editor if needed
      if (showPrompt) {
        setShowPrompt(false)
        promptFetchedRef.current = false
        setAiPrompt(null)
      }
      handleKeyboardInput()
      addCharacter(char)
    },
    [showPrompt, handleKeyboardInput, addCharacter]
  )

  // Handle backspace
  const handleBackspace = useCallback(() => {
    if (showPrompt) {
      setShowPrompt(false)
    }
    handleKeyboardInput()
    deleteCharacter()
  }, [showPrompt, handleKeyboardInput, deleteCharacter])

  // Handle enter
  const handleEnter = useCallback(() => {
    if (showPrompt) {
      setShowPrompt(false)
      promptFetchedRef.current = false
      setAiPrompt(null)
    }
    handleKeyboardInput()
    addNewLine()
  }, [showPrompt, handleKeyboardInput, addNewLine])

  // Keyboard capture
  useKeyboardCapture({
    onCharacter: handleCharacter,
    onBackspace: handleBackspace,
    onEnter: handleEnter,
    enabled: true,
  })

  // Fetch AI prompt on load or when all text fades
  useEffect(() => {
    const shouldFetchPrompt =
      (allFaded && allWords.length > 0) || // All text faded
      (allWords.length === 0 && lines.length === 1) // Initial empty state

    if (shouldFetchPrompt && !promptFetchedRef.current && showPrompt) {
      promptFetchedRef.current = true
      setIsLoadingPrompt(true)

      const context = historyContent || initialDocument?.content || ''

      fetch('/api/ai/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      })
        .then((res) => res.json())
        .then((data) => {
          setAiPrompt(data.prompt)
        })
        .catch(() => {
          setAiPrompt('What would you like to write about?')
        })
        .finally(() => {
          setIsLoadingPrompt(false)
        })
    }
  }, [allFaded, allWords.length, lines.length, showPrompt, historyContent, initialDocument?.content])

  // Auto-save when content changes
  useEffect(() => {
    if (fullContent.trim()) {
      const words: WordWithTimestamp[] = allWords.map((w) => ({
        id: w.id,
        word: w.characters.map((c) => c.char).join(''),
        typedAt: w.startedAt,
      }))
      debouncedSave(fullContent, words, title)
    }
  }, [fullContent, allWords, title, debouncedSave])

  // Handle title changes
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle)
    },
    []
  )

  // Word count
  const wordCount = useMemo(() => {
    return fullContent.split(/\s+/).filter(Boolean).length
  }, [fullContent])

  return (
    <div className="dream-gradient min-h-screen relative">
      <EditorToolbar
        title={title}
        onTitleChange={handleTitleChange}
        isSaving={isSaving}
        lastSaved={lastSaved}
        wordCount={wordCount}
        error={saveError}
      />

      {/* Main scroll container */}
      <div
        ref={containerRef}
        className="dream-scroll-container min-h-screen pt-14"
        style={{
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* History zone (above editor) */}
        {historyContent && (
          <HistoryView
            content={historyContent}
            opacity={historyOpacity}
            onHeightChange={updateHistoryHeight}
          />
        )}

        {/* Editor zone */}
        <div
          className="editor-fade-on-scroll"
          style={{
            paddingTop: historyContent ? '2rem' : '30vh',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            opacity: editorOpacity,
            minHeight: '70vh',
          }}
        >
          {/* Lines container with scroll offset */}
          <div
            className="max-w-[700px] mx-auto line-scrolling"
            style={containerStyle}
          >
            {lines.map((line, lineIndex) => (
              <WritingLine
                key={line.id}
                line={line}
                isCurrentLine={lineIndex === currentLineIndex}
                isWordFading={isWordFading}
                isWordFaded={isWordFaded}
                recentCharIds={recentCharIds}
                onHeightChange={registerLineHeight}
              />
            ))}
          </div>
        </div>

        {/* Spacer to allow scrolling past the last line */}
        <div style={{ height: '50vh' }} />
      </div>

      {/* AI prompt overlay */}
      {showPrompt && isInEditor && (
        <IdlePrompt
          prompt={aiPrompt}
          isLoading={isLoadingPrompt}
          opacity={promptOpacity}
          onDismiss={() => setShowPrompt(false)}
        />
      )}
    </div>
  )
}
