'use client'

import { useState, useRef, useEffect, ReactNode, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: string
  children: ReactNode
  /** Delay in ms before showing on hover (default: 200) */
  delay?: number
  /** Position relative to trigger (default: 'top') */
  position?: 'top' | 'bottom' | 'left' | 'right'
}

interface TooltipPosition {
  top: number
  left: number
}

export function Tooltip({ content, children, delay = 200, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    // Detect touch device
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const gap = 8

    let top = 0
    let left = 0

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - gap
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        break
      case 'bottom':
        top = triggerRect.bottom + gap
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        break
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        left = triggerRect.left - tooltipRect.width - gap
        break
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        left = triggerRect.right + gap
        break
    }

    // Keep tooltip within viewport
    const padding = 8
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding))
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding))

    setTooltipPosition({ top, left })
  }, [position])

  useEffect(() => {
    if (isVisible) {
      // Initial position calculation
      requestAnimationFrame(calculatePosition)
    }
  }, [isVisible, calculatePosition])

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsVisible(false)
  }

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (isTouchDevice) {
      e.preventDefault()
      setIsVisible(!isVisible)
    }
  }

  // Close on outside click for mobile
  useEffect(() => {
    if (!isVisible || !isTouchDevice) return

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsVisible(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
    }
  }, [isVisible, isTouchDevice])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const arrowPosition = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-foreground/90',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-foreground/90',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-foreground/90',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-foreground/90'
  }

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={!isTouchDevice ? showTooltip : undefined}
      onMouseLeave={!isTouchDevice ? hideTooltip : undefined}
      onClick={handleClick}
      onTouchEnd={handleClick}
    >
      {children}
      {mounted && isVisible && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-9999 pointer-events-none"
          style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
          role="tooltip"
        >
          <div className="bg-foreground/90 text-background text-xs px-2 py-1.5 rounded-md max-w-50 text-center leading-snug shadow-lg">
            {content}
          </div>
          <div
            className={`absolute w-0 h-0 border-4 ${arrowPosition[position]}`}
          />
        </div>,
        document.body
      )}
    </div>
  )
}

/**
 * Small info icon with tooltip - for use next to labels
 */
export function InfoTooltip({ content, delay = 200 }: { content: string; delay?: number }) {
  return (
    <Tooltip content={content} delay={delay}>
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-foreground/10 text-foreground/50 hover:bg-foreground/20 hover:text-foreground/70 cursor-help transition-colors ml-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </span>
    </Tooltip>
  )
}
