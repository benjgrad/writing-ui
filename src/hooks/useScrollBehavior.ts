'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseScrollBehaviorOptions {
  containerRef: React.RefObject<HTMLDivElement | null>
  editorZoneTop: number // The Y position where editor zone starts (e.g., 30vh)
  hasHistory?: boolean // Whether there's history content to scroll to
  onReturnToEditor?: () => void
  enabled?: boolean
}

export type ScrollZone = 'editor' | 'history' | 'transitioning'

export function useScrollBehavior({
  containerRef,
  editorZoneTop,
  hasHistory = false,
  onReturnToEditor,
  enabled = true,
}: UseScrollBehaviorOptions) {
  // Current scroll zone
  const [currentZone, setCurrentZone] = useState<ScrollZone>('editor')

  // Opacity values for transitions
  // History starts visible if there's content to show
  const [promptOpacity, setPromptOpacity] = useState(1)
  const [editorOpacity, setEditorOpacity] = useState(1)
  const [historyOpacity, setHistoryOpacity] = useState(hasHistory ? 0.9 : 0)

  // Track if we're programmatically scrolling (to avoid triggering zone changes)
  const isAutoScrolling = useRef(false)

  // Reference to the history zone height
  const historyHeightRef = useRef(0)

  // Track if we've done initial scroll setup
  const initialScrollDone = useRef(false)

  // Initialize scroll position to show editor (scroll past history)
  useEffect(() => {
    const container = containerRef.current
    if (!container || !hasHistory || initialScrollDone.current) return

    // Get the history section height and scroll past it
    const historySection = container.querySelector('[data-history-zone]') as HTMLElement
    if (historySection) {
      historyHeightRef.current = historySection.offsetHeight
      // Scroll to just past the history, so editor is visible
      container.scrollTop = historyHeightRef.current
      initialScrollDone.current = true
    }
  }, [containerRef, hasHistory])

  // Allow scrolling up to history even before typing starts
  // Set initial history height when content is available
  useEffect(() => {
    if (!hasHistory) return

    // Use a small delay to ensure the DOM has rendered
    const timer = setTimeout(() => {
      const container = containerRef.current
      if (!container) return

      const historySection = container.querySelector('[data-history-zone]') as HTMLElement
      if (historySection && historyHeightRef.current === 0) {
        historyHeightRef.current = historySection.offsetHeight
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [containerRef, hasHistory])

  // Calculate scroll progress (0 = at editor, 1 = fully in history)
  const calculateScrollProgress = useCallback(() => {
    const container = containerRef.current
    if (!container) return 0

    const scrollTop = container.scrollTop
    const historyHeight = historyHeightRef.current || editorZoneTop

    // Progress is based on how far we've scrolled UP into history
    // At scrollTop = historyHeight, we're at the editor (progress = 0)
    // At scrollTop = 0, we're at full history (progress = 1)
    if (historyHeight <= 0) return 0

    const progress = 1 - (scrollTop / historyHeight)
    return Math.max(0, Math.min(1, progress))
  }, [containerRef, editorZoneTop])

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!enabled || isAutoScrolling.current) return

    const progress = calculateScrollProgress()

    // Update opacities based on scroll progress
    // As we scroll UP (progress → 1): prompt fades out, editor fades out, history fades in
    setPromptOpacity(1 - progress)
    setEditorOpacity(1 - progress * 0.8) // Editor fades as we scroll up
    setHistoryOpacity(progress) // History fades in as we scroll up

    // Determine current zone
    if (progress < 0.1) {
      setCurrentZone('editor')
    } else if (progress > 0.9) {
      setCurrentZone('history')
    } else {
      setCurrentZone('transitioning')
    }
  }, [enabled, calculateScrollProgress])

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return

    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [containerRef, enabled, handleScroll])

  // Scroll back to editor zone (scroll down past history)
  const scrollToEditor = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    isAutoScrolling.current = true

    const historyHeight = historyHeightRef.current || editorZoneTop
    container.scrollTo({
      top: historyHeight,
      behavior: 'smooth',
    })

    // Reset opacities
    setPromptOpacity(1)
    setEditorOpacity(1)
    setHistoryOpacity(0)
    setCurrentZone('editor')

    // Reset auto-scroll flag after animation completes
    setTimeout(() => {
      isAutoScrolling.current = false
      onReturnToEditor?.()
    }, 300)
  }, [containerRef, editorZoneTop, onReturnToEditor])

  // Scroll to history zone (scroll up to top)
  const scrollToHistory = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    isAutoScrolling.current = true

    container.scrollTo({
      top: 0,
      behavior: 'smooth',
    })

    setHistoryOpacity(1)
    setEditorOpacity(0.2)
    setPromptOpacity(0)
    setCurrentZone('history')

    // Reset auto-scroll flag after animation completes
    setTimeout(() => {
      isAutoScrolling.current = false
    }, 300)
  }, [containerRef])

  // Force return to editor on any keyboard input
  const handleKeyboardInput = useCallback(() => {
    if (currentZone !== 'editor') {
      scrollToEditor()
    }
  }, [currentZone, scrollToEditor])

  // Update history height when it changes
  const updateHistoryHeight = useCallback((height: number) => {
    historyHeightRef.current = height
  }, [])

  return {
    currentZone,
    promptOpacity,
    editorOpacity,
    historyOpacity,
    scrollToEditor,
    scrollToHistory,
    handleKeyboardInput,
    updateHistoryHeight,
    isInHistory: currentZone === 'history',
    isInEditor: currentZone === 'editor',
    isTransitioning: currentZone === 'transitioning',
  }
}
