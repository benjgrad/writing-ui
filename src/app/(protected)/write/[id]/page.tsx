import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FadingEditor } from '@/components/editor/FadingEditor'
import type { Document } from '@/types/document'

interface WritePageProps {
  params: Promise<{ id: string }>
}

export default async function WritePage({ params }: WritePageProps) {
  const { id } = await params
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

  return <FadingEditor userId={user.id} initialDocument={document} />
}
