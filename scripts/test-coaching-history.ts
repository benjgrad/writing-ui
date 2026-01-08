#!/usr/bin/env npx tsx
/**
 * Test script to debug coaching history loading
 * Usage: TEST_USER_EMAIL="test@example.com" TEST_USER_PASSWORD="testpassword123" npx tsx scripts/test-coaching-history.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eirikdrclttmtuyrqxep.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_IAqLcYj7gaLAfjTm3bQrsg_bcMn8sdR'

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123'

async function main() {
  console.log('=== Coaching History Debug Test ===\n')

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // 1. Sign in as test user
  console.log(`1. Signing in as ${TEST_EMAIL}...`)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  if (authError) {
    console.error('   Auth error:', authError.message)
    process.exit(1)
  }

  console.log('   Signed in successfully!')
  console.log('   User ID:', authData.user?.id)

  // 2. Fetch all goals for the user
  console.log('\n2. Fetching goals...')
  const { data: goals, error: goalsError } = await supabase
    .from('goals')
    .select('id, title, why_root, status')
    .eq('user_id', authData.user?.id)
    .order('created_at', { ascending: false })

  if (goalsError) {
    console.error('   Goals error:', goalsError.message)
  } else {
    console.log(`   Found ${goals?.length || 0} goals:`)
    goals?.forEach((g, i) => {
      console.log(`   ${i + 1}. [${g.status}] ${g.title}`)
      console.log(`      ID: ${g.id}`)
    })
  }

  // 3. Fetch all coaching sessions for the user
  console.log('\n3. Fetching coaching sessions...')
  const { data: sessions, error: sessionsError } = await supabase
    .from('coaching_sessions')
    .select(`
      id,
      goal_id,
      stage,
      is_active,
      created_at,
      coaching_messages (id, role, content)
    `)
    .eq('user_id', authData.user?.id)
    .order('created_at', { ascending: false })

  if (sessionsError) {
    console.error('   Sessions error:', sessionsError.message)
    console.error('   Full error:', JSON.stringify(sessionsError, null, 2))
  } else {
    console.log(`   Found ${sessions?.length || 0} coaching sessions:`)
    sessions?.forEach((s: any, i: number) => {
      console.log(`   ${i + 1}. Session ${s.id}`)
      console.log(`      Goal ID: ${s.goal_id || '(none)'}`)
      console.log(`      Stage: ${s.stage}`)
      console.log(`      Active: ${s.is_active}`)
      console.log(`      Messages: ${s.coaching_messages?.length || 0}`)
    })
  }

  // 4. Check if sessions are linked to goals
  console.log('\n4. Checking session-goal linkage...')
  if (goals && goals.length > 0 && sessions && sessions.length > 0) {
    for (const goal of goals) {
      const linkedSession = sessions.find((s: any) => s.goal_id === goal.id)
      if (linkedSession) {
        console.log(`   Goal "${goal.title}" has linked session`)
        console.log(`      Session ID: ${linkedSession.id}`)
        console.log(`      Messages: ${(linkedSession as any).coaching_messages?.length || 0}`)
      } else {
        console.log(`   Goal "${goal.title}" has NO linked session`)
      }
    }
  }

  // 5. Try to fetch coaching session for the first goal (if any)
  if (goals && goals.length > 0) {
    const firstGoal = goals[0]
    console.log(`\n5. Testing session fetch for goal: ${firstGoal.title}`)
    console.log(`   Goal ID: ${firstGoal.id}`)

    const { data: goalSessions, error: goalSessionsError } = await supabase
      .from('coaching_sessions')
      .select(`
        *,
        coaching_messages (*)
      `)
      .eq('goal_id', firstGoal.id)
      .order('created_at', { ascending: false })

    if (goalSessionsError) {
      console.error('   Error fetching sessions for goal:', goalSessionsError.message)
      console.error('   Full error:', JSON.stringify(goalSessionsError, null, 2))
    } else {
      console.log(`   Found ${goalSessions?.length || 0} sessions for this goal`)
      if (goalSessions && goalSessions.length > 0) {
        const session = goalSessions[0] as any
        console.log('   First session:')
        console.log(`      ID: ${session.id}`)
        console.log(`      Stage: ${session.stage}`)
        console.log(`      Message count: ${session.coaching_messages?.length || 0}`)
        if (session.coaching_messages && session.coaching_messages.length > 0) {
          console.log('   Messages preview:')
          session.coaching_messages.slice(0, 3).forEach((m: any, i: number) => {
            console.log(`      ${i + 1}. [${m.role}] ${m.content.substring(0, 60)}...`)
          })
        }
      }
    }
  }

  // 6. Check RLS policies
  console.log('\n6. Checking table access...')

  // Try direct select on coaching_sessions
  const { count: sessionCount, error: countError } = await supabase
    .from('coaching_sessions')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('   Cannot access coaching_sessions table:', countError.message)
    console.error('   This might indicate RLS policy issues or missing table')
  } else {
    console.log(`   coaching_sessions accessible, total rows visible: ${sessionCount}`)
  }

  // Try direct select on coaching_messages
  const { count: messageCount, error: msgCountError } = await supabase
    .from('coaching_messages')
    .select('*', { count: 'exact', head: true })

  if (msgCountError) {
    console.error('   Cannot access coaching_messages table:', msgCountError.message)
    console.error('   This might indicate RLS policy issues or missing table')
  } else {
    console.log(`   coaching_messages accessible, total rows visible: ${messageCount}`)
  }

  console.log('\n=== Test Complete ===')
}

main().catch(console.error)
