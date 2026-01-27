'use client'

import { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import cloud from 'd3-cloud'
import type { WordCloudItem } from '@/types/word-cloud'

interface WordCloudProps {
  items: WordCloudItem[]
  onHideWord?: (word: string) => void
  maxItems?: number
}

interface LayoutWord {
  text: string
  size: number
  importance: number  // renamed from 'weight' to avoid d3-cloud conflict
  noteCount: number
  x?: number
  y?: number
  rotate?: number
}

// Format word for display (capitalize first letter)
function formatWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

export function WordCloud({ items, onHideWord, maxItems = 200 }: WordCloudProps) {
  const [words, setWords] = useState<LayoutWord[]>([])
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; word: string } | null>(null)
  const [longPressWord, setLongPressWord] = useState<string | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        const { width } = entry.contentRect
        // Taller height to fit more words
        setDimensions({ width, height: Math.min(600, width * 0.75) })
      }
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Prepare words for layout
  const inputWords = useMemo(() => {
    const limited = items.slice(0, maxItems)

    // Find min/max noteCount for scaling within displayed items
    const counts = limited.map(item => item.noteCount)
    const minCount = Math.min(...counts)
    const maxCount = Math.max(...counts)
    const countRange = maxCount - minCount || 1

    // Map noteCount to font size with dramatic variation
    // Use sqrt scale for better visual distribution (prevents largest from dominating)
    return limited.map(item => {
      // Normalize to 0-1 based on count within this subset
      const normalized = (item.noteCount - minCount) / countRange
      // Apply sqrt for better visual scaling, then map to size range
      // Smaller min size (10px) to fit more words, max 48px
      const size = 10 + Math.sqrt(normalized) * 38  // 10px to 48px
      return {
        text: formatWord(item.word),
        size: Math.round(size),
        importance: item.weight,
        noteCount: item.noteCount,
      }
    })
  }, [items, maxItems])

  // Run d3-cloud layout
  useEffect(() => {
    if (inputWords.length === 0 || dimensions.width === 0) {
      return
    }

    const layout = cloud<LayoutWord>()
      .size([dimensions.width, dimensions.height])
      .words(inputWords.map(w => ({ ...w })))
      .padding(2)
      .rotate(() => 0) // All horizontal as requested
      .font('Inter, system-ui, sans-serif')
      .fontSize(d => d.size)
      .spiral('archimedean')
      .random(() => 0.5) // Deterministic layout
      .on('end', (output) => {
        setWords(output)
      })

    layout.start()
  }, [inputWords, dimensions])

  // Handle right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, word: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, word })
  }, [])

  // Handle long press for mobile
  const handleTouchStart = useCallback((word: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setLongPressWord(word)
    }, 500)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu || longPressWord) {
        setContextMenu(null)
        setLongPressWord(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [contextMenu, longPressWord])

  // Handle hide action
  const handleHide = useCallback((word: string) => {
    onHideWord?.(word.toLowerCase())
    setContextMenu(null)
    setLongPressWord(null)
  }, [onHideWord])

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-muted text-sm">
        No topics yet. Start writing to see your interests emerge.
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Word cloud SVG */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="overflow-visible"
      >
        <g transform={`translate(${dimensions.width / 2}, ${dimensions.height / 2})`}>
          {words.map((word, i) => (
            <text
              key={`${word.text}-${i}`}
              textAnchor="middle"
              transform={`translate(${word.x}, ${word.y}) rotate(${word.rotate || 0})`}
              style={{
                fontSize: `${word.size}px`,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: word.importance >= 7 ? 600 : 400,
                fill: 'currentColor',
                opacity: 0.4 + (word.importance / 10) * 0.6,
                cursor: 'default',
                userSelect: 'none',
              }}
              className="text-foreground transition-opacity hover:opacity-100!"
              onContextMenu={(e) => handleContextMenu(e, word.text)}
              onTouchStart={() => handleTouchStart(word.text)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <title>{word.noteCount} mention{word.noteCount !== 1 ? 's' : ''}</title>
              {word.text}
            </text>
          ))}
        </g>
      </svg>

      {/* Context menu (desktop) */}
      {contextMenu && onHideWord && (
        <div
          className="fixed z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-30"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleHide(contextMenu.word)}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-foreground/5 transition-colors"
          >
            Hide "{contextMenu.word}"
          </button>
        </div>
      )}

      {/* Long press menu (mobile) */}
      {longPressWord && onHideWord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={() => setLongPressWord(null)}
        >
          <div
            className="bg-background border border-border rounded-lg shadow-lg py-1 min-w-40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 text-sm font-medium border-b border-border">
              {longPressWord}
            </div>
            <button
              onClick={() => handleHide(longPressWord)}
              className="w-full px-3 py-2 text-sm text-left hover:bg-foreground/5 transition-colors"
            >
              Hide this word
            </button>
            <button
              onClick={() => setLongPressWord(null)}
              className="w-full px-3 py-2 text-sm text-left text-muted hover:bg-foreground/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Show more indicator */}
      {items.length > maxItems && (
        <div className="text-center text-xs text-muted py-2">
          +{items.length - maxItems} more
        </div>
      )}
    </div>
  )
}
