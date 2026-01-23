import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CoachingProvider } from '@/components/coaching/CoachingProvider'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Skip auth check when SKIP_AUTH is enabled (for testing/development)
  if (process.env.SKIP_AUTH === 'true') {
    return <CoachingProvider>{children}</CoachingProvider>
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <CoachingProvider>{children}</CoachingProvider>
}
