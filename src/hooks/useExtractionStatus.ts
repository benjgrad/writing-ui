'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ExtractionStats {
  pending: number
  processing: number
  completed_today: number
  failed: number
}

interface ExtractionJob {
  id: string
  source_type: string
  status: string
  created_at: string
  notes_created: number | null
}

export function useExtractionStatus() {
  const [stats, setStats] = useState<ExtractionStats>({
    pending: 0,
    processing: 0,
    completed_today: 0,
    failed: 0
  })
  const [recentJobs, setRecentJobs] = useState<ExtractionJob[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)

  const supabase = createClient()

  const fetchStats = useCallback(async () => {
    if (!isEnabled) return

    try {
      // Get all queue items for the current user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: queueItems, error } = await (supabase as any)
        .from('extraction_queue')
        .select('id, source_type, status, created_at, notes_created')
        .order('created_at', { ascending: false })

      if (error) {
        // Table doesn't exist yet - disable further attempts
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setIsEnabled(false)
          return
        }
        // Other errors - log but don't spam console
        return
      }

      if (!queueItems) {
        return
      }

      // Calculate stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const counts = {
        pending: 0,
        processing: 0,
        completed_today: 0,
        failed: 0
      }

      for (const item of queueItems) {
        if (item.status === 'pending') {
          counts.pending++
        } else if (item.status === 'processing') {
          counts.processing++
        } else if (item.status === 'failed') {
          counts.failed++
        } else if (item.status === 'completed') {
          const completedDate = new Date(item.created_at)
          if (completedDate >= today) {
            counts.completed_today++
          }
        }
      }

      setStats(counts)
      setIsProcessing(counts.pending > 0 || counts.processing > 0)
      setRecentJobs(queueItems.slice(0, 5))
    } catch (err) {
      console.error('Error in fetchStats:', err)
    }
  }, [supabase])

  useEffect(() => {
    if (!isEnabled) return

    fetchStats()

    // Subscribe to realtime changes on extraction_queue
    const channel = supabase
      .channel('extraction_queue_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'extraction_queue' },
        () => {
          fetchStats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchStats, isEnabled])

  return {
    stats,
    recentJobs,
    isProcessing,
    refresh: fetchStats
  }
}
