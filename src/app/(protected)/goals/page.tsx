'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect /goals to /pursuits
export default function GoalsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/pursuits')
  }, [router])

  return null
}
