#!/usr/bin/env npx tsx
/**
 * Test the coaching session API endpoints directly
 * Usage: TEST_USER_EMAIL="test@example.com" TEST_USER_PASSWORD="testpassword123" npx tsx scripts/test-coaching-api.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eirikdrclttmtuyrqxep.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_IAqLcYj7gaLAfjTm3bQrsg_bcMn8sdR'
const BASE_URL = 'http://localhost:3000'

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123'

async function main() {
  console.log('=== Coaching API Test ===\n')

  // Create Supabase client and sign in to get auth cookies
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  console.log(`1. Signing in as ${TEST_EMAIL}...`)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  if (authError) {
    console.error('   Auth error:', authError.message)
    process.exit(1)
  }

  console.log('   Signed in!')
  const accessToken = authData.session?.access_token
  console.log('   Got access token:', accessToken?.substring(0, 20) + '...')

  // Get the goal ID from the database
  console.log('\n2. Fetching goals from database...')
  const { data: goals } = await supabase
    .from('goals')
    .select('id, title')
    .order('created_at', { ascending: false })
    .limit(1)

  if (!goals || goals.length === 0) {
    console.error('   No goals found!')
    process.exit(1)
  }

  const goalId = goals[0].id
  console.log(`   Found goal: ${goals[0].title}`)
  console.log(`   Goal ID: ${goalId}`)

  // Test the API endpoints
  console.log('\n3. Testing GET /api/coaching-sessions?goal_id=...')

  try {
    const response = await fetch(`${BASE_URL}/api/coaching-sessions?goal_id=${goalId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Cookie': `sb-access-token=${accessToken}`
      }
    })

    console.log(`   Status: ${response.status}`)
    const data = await response.json()
    console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 500))

    if (data.sessions && data.sessions.length > 0) {
      const sessionId = data.sessions[0].id
      console.log(`\n4. Testing GET /api/coaching-sessions/${sessionId}...`)

      const detailResponse = await fetch(`${BASE_URL}/api/coaching-sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Cookie': `sb-access-token=${accessToken}`
        }
      })

      console.log(`   Status: ${detailResponse.status}`)
      const detailData = await detailResponse.json()
      console.log(`   Session has ${detailData.session?.messages?.length || 0} messages`)

      if (detailData.session?.messages?.length > 0) {
        console.log('   First message:', detailData.session.messages[0].content.substring(0, 60) + '...')
      }
    }
  } catch (err) {
    console.error('   Fetch error:', err)
  }

  console.log('\n=== Test Complete ===')
}

main().catch(console.error)
