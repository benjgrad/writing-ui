import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DreamEditor } from '@/components/editor/DreamEditor'
import type { Document } from '@/types/document'

const TEST_USER_ID = 'test-user-00000000-0000-0000-0000-000000000000'

interface WritePageProps {
  params: Promise<{ id: string }>
}

export default async function WritePage({ params }: WritePageProps) {
  const { id } = await params

  // Handle test mode - skip auth and use test user
  if (process.env.SKIP_AUTH === 'true') {
    return <DreamEditor userId={TEST_USER_ID} initialDocument={null} />
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  let document: Document | null = null

  if (id !== 'new') {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (data) {
      document = data as Document
    }
  }

  return <DreamEditor userId={user.id} initialDocument={document} />
}
