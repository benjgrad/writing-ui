#!/usr/bin/env npx tsx
/**
 * Test script to create a goal with coaching session and then load it
 * Usage: TEST_USER_EMAIL="test@example.com" TEST_USER_PASSWORD="testpassword123" npx tsx scripts/test-create-goal-with-coaching.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eirikdrclttmtuyrqxep.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_IAqLcYj7gaLAfjTm3bQrsg_bcMn8sdR'

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123'

async function main() {
  console.log('=== Create Goal with Coaching Session Test ===\n')

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
  const userId = authData.user?.id
  console.log('   User ID:', userId)

  // 2. Create a test goal
  console.log('\n2. Creating test goal...')
  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      title: 'Learn to play guitar',
      why_root: 'Music brings me joy and I want to express myself creatively',
      status: 'active',
      momentum: 3
    })
    .select()
    .single()

  if (goalError) {
    console.error('   Goal creation error:', goalError.message)
    process.exit(1)
  }

  console.log('   Created goal:', goal.title)
  console.log('   Goal ID:', goal.id)

  // 3. Create a coaching session linked to the goal
  console.log('\n3. Creating coaching session...')
  const { data: session, error: sessionError } = await supabase
    .from('coaching_sessions')
    .insert({
      user_id: userId,
      goal_id: goal.id,
      stage: 'complete',
      is_active: false
    })
    .select()
    .single()

  if (sessionError) {
    console.error('   Session creation error:', sessionError.message)
    // Try to clean up goal
    await supabase.from('goals').delete().eq('id', goal.id)
    process.exit(1)
  }

  console.log('   Created session:', session.id)

  // 4. Add coaching messages to the session
  console.log('\n4. Adding coaching messages...')
  const messages = [
    { role: 'assistant', content: 'Welcome to your goal coaching session! What goal would you like to work on today?' },
    { role: 'user', content: 'I want to learn to play guitar. I\'ve always admired musicians and want to be able to play my favorite songs.' },
    { role: 'assistant', content: 'That\'s a wonderful goal! Learning guitar can be incredibly rewarding. Why does learning to play guitar matter to you on a deeper level?' },
    { role: 'user', content: 'Music brings me joy and I want to express myself creatively. It\'s also a way to connect with others and maybe even perform someday.' },
    { role: 'assistant', content: 'I love that - creative expression and connection through music are powerful motivations. What\'s one small first step you could take this week to begin your guitar journey?' },
    { role: 'user', content: 'I could buy a beginner guitar and watch some YouTube tutorials to learn my first chord.' },
    { role: 'assistant', content: 'Perfect! Starting with one chord is achievable and will give you momentum. Are you ready to commit to this goal: "Learn to play guitar" with your first step of buying a beginner guitar and learning your first chord this week?' },
    { role: 'user', content: 'Yes, I\'m committed!' },
    { role: 'assistant', content: 'Excellent! Your goal has been created. You\'ve got this! Remember, every master guitarist started exactly where you are now. 🎸' }
  ]

  for (const msg of messages) {
    const { error: msgError } = await supabase
      .from('coaching_messages')
      .insert({
        session_id: session.id,
        role: msg.role,
        content: msg.content
      })

    if (msgError) {
      console.error(`   Message insert error: ${msgError.message}`)
    }
  }
  console.log(`   Added ${messages.length} messages`)

  // 5. Create a micro-win for the goal
  console.log('\n5. Adding micro-win...')
  const { error: microWinError } = await supabase
    .from('micro_wins')
    .insert({
      goal_id: goal.id,
      description: 'Buy a beginner guitar and learn first chord',
      is_current: true
    })

  if (microWinError) {
    console.error('   Micro-win error:', microWinError.message)
  } else {
    console.log('   Added micro-win')
  }

  // 6. Now test loading the coaching history
  console.log('\n6. Testing coaching history loading...')
  const { data: loadedSessions, error: loadError } = await supabase
    .from('coaching_sessions')
    .select(`
      *,
      coaching_messages (*)
    `)
    .eq('goal_id', goal.id)
    .order('created_at', { ascending: false })

  if (loadError) {
    console.error('   Load error:', loadError.message)
  } else {
    console.log(`   Found ${loadedSessions?.length || 0} sessions for goal`)
    if (loadedSessions && loadedSessions.length > 0) {
      const loadedSession = loadedSessions[0] as any
      console.log(`   Session ID: ${loadedSession.id}`)
      console.log(`   Messages: ${loadedSession.coaching_messages?.length || 0}`)
      console.log('\n   Message preview:')
      loadedSession.coaching_messages?.slice(0, 3).forEach((m: any, i: number) => {
        console.log(`      ${i + 1}. [${m.role}] ${m.content.substring(0, 50)}...`)
      })
    }
  }

  console.log('\n=== Test Complete ===')
  console.log(`\nGoal ID for testing: ${goal.id}`)
  console.log(`Session ID for testing: ${session.id}`)
  console.log('\nYou can now test the coaching history button in the UI!')
}

main().catch(console.error)
