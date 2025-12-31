'use client'

import { useRef, useEffect } from 'react'

interface HistoryViewProps {
  content: string
  opacity?: number
  onHeightChange?: (height: number) => void
}

export function HistoryView({ content, opacity = 0.9, onHeightChange }: HistoryViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Report height changes to parent
  useEffect(() => {
    if (!containerRef.current || !onHeightChange) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onHeightChange(entry.contentRect.height)
      }
    })

    observer.observe(containerRef.current)
    // Initial height report
    onHeightChange(containerRef.current.offsetHeight)

    return () => observer.disconnect()
  }, [onHeightChange])

  if (!content.trim()) {
    return null
  }

  // Split content into paragraphs
  const paragraphs = content.split('\n').filter((p) => p.trim())

  return (
    <div
      ref={containerRef}
      data-history-zone
      className="history-container history-text"
      style={{
        opacity,
        maxWidth: '700px',
        margin: '0 auto',
        padding: '2rem 1rem',
        minHeight: '50vh', // Ensure there's space to scroll
      }}
    >
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          style={{
            marginBottom: '1em',
          }}
        >
          {paragraph}
        </p>
      ))}
    </div>
  )
}
