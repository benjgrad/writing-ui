/**
 * Reflective Journal Entries, Planning Documents, and Edge Case Fixtures
 *
 * 20 reflective entries - personal journaling, self-observation, emotional processing
 * 15 planning documents - project plans, strategy docs, roadmaps
 * 10 edge cases - challenging content for extraction testing
 */

import type { QualityExpectation, NoteStatus, NoteType, Stakeholder } from '../../quality/types'

export interface ContentFixture {
  id: string
  title: string
  content: string
  sourceType: 'reflective' | 'planning' | 'edge-case'
  expectedNotes: QualityExpectation[]
  metadata: {
    projectContext: string
    complexity: 'simple' | 'moderate' | 'complex'
    contentType: string
    themes: string[]
  }
}

// =============================================================================
// REFLECTIVE JOURNAL ENTRIES (1-20)
// =============================================================================

export const REFLECTIVE_ENTRIES: ContentFixture[] = [
  {
    id: 'reflect-001',
    title: 'Morning Pages - Wrestling with Imposter Syndrome',
    content: `Today I woke up with that familiar knot in my stomach. The one that whispers "you're not good enough." I've been building this writing app for months now, and some days I feel like I'm just pretending to know what I'm doing.

The funny thing is, when I look at my code from three months ago, I can see how much I've grown. I didn't know what a React hook was back then. Now I'm building custom hooks that manage complex state. That's not nothing.

I think the imposter syndrome hits hardest when I compare my insides to other people's outsides. I see polished apps on Twitter and think "I could never build that." But I don't see their journey, their failures, their 3 AM debugging sessions.

What if I tried to flip this feeling? Instead of "I'm not good enough," what if I thought "I'm still learning, and that's exactly where I should be"? The discomfort means I'm at my growth edge.

Today I'm going to try something different. Every time that voice says "you're not good enough," I'll respond with "you're learning something new." Let's see if that helps.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['imposter syndrome', 'self-doubt', 'growth mindset'],
        contentMustContain: ['imposter', 'learning', 'growth', 'comparison'],
        purposePattern: /I am keeping this because.*(self-awareness|growth|imposter)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/reflect'],
        forbiddenTags: ['#imposter-syndrome', '#feelings'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Growth Mindset]]', '[[Self-Compassion]]'],
        isSynthesis: true,
        synthesisIndicators: ['flip this feeling', 'learning something new', 'growth edge'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      contentType: 'morning-pages',
      themes: ['self-doubt', 'growth', 'mindset'],
    },
  },
  {
    id: 'reflect-002',
    title: 'Evening Reflection - The Power of Small Wins',
    content: `I'm sitting here at the end of the day feeling... satisfied? That's rare.

Today I fixed a bug that had been haunting me for a week. The mobile keyboard issue - turns out iOS requires focus() to be called in direct response to a user gesture. Such a small thing, but it was blocking everything.

What made today different? I think it was my approach. Instead of trying to solve the whole problem at once, I broke it into tiny steps:
1. Can I reproduce the bug consistently?
2. What's different between desktop and mobile?
3. What happens when I try a simple button?

Step 3 was the breakthrough. The button worked. The difference was timing - setTimeout was breaking the gesture chain.

This reminds me of something James Clear wrote about 1% improvements. You don't need to solve everything at once. You just need to make the next thing a little better.

I want to remember this feeling. Not the satisfaction of fixing the bug - that's fleeting. But the satisfaction of working systematically, trusting the process, staying curious instead of frustrated.

Tomorrow's challenge: the graph nodes flying off screen. Same approach. Small steps.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['small wins', 'systematic debugging', 'incremental progress'],
        contentMustContain: ['small', 'steps', 'systematic', 'curious'],
        purposePattern: /I am keeping this because.*(systematic|small wins|process)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/reflect'],
        forbiddenTags: ['#debugging', '#wins'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Incremental Progress]]', '[[Debugging Process]]'],
        isSynthesis: true,
        synthesisIndicators: ['trusting the process', 'remember this feeling', '1% improvements'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'simple',
      contentType: 'evening-reflection',
      themes: ['process', 'debugging', 'mindset'],
    },
  },
  {
    id: 'reflect-003',
    title: 'On Frustration and Flow',
    content: `I've noticed a pattern in my work: frustration often comes right before flow.

When I'm struggling with a problem - really struggling, to the point of wanting to give up - that's usually when I'm about to break through. It's like the mind is doing heavy lifting in the background, and the frustration is the signal that the lifting is almost done.

Today I spent two hours on the CSS double scrollbar issue. At hour one, I was ready to throw my laptop. At hour two, I found the answer almost by accident. The solution was simple (overflow: hidden on the parent), but I couldn't see it until I'd exhausted the wrong approaches.

This maps to something I read about deliberate practice. The zone where you're struggling but not drowning - that's where learning happens. Too easy and you're coasting. Too hard and you give up. Right at the edge of your ability is where the magic is.

I want to get better at recognizing this feeling. When frustration hits, instead of catastrophizing ("this is impossible, I'm terrible"), I could try noticing ("I'm at my growth edge, breakthrough might be close").

Not sure if this reframe will work consistently, but it's worth trying.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['frustration and flow', 'deliberate practice', 'growth edge'],
        contentMustContain: ['frustration', 'flow', 'breakthrough', 'edge'],
        purposePattern: /I am keeping this because.*(frustration|flow|growth edge)/i,
        expectedProject: null,
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/reflect'],
        forbiddenTags: ['#frustration', '#flow'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Deliberate Practice]]', '[[Flow State]]'],
        isSynthesis: true,
        synthesisIndicators: ['pattern', 'reframe', 'growth edge'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      contentType: 'journal-entry',
      themes: ['emotions', 'learning', 'flow'],
    },
  },
  {
    id: 'reflect-004',
    title: 'Why Am I Building This App?',
    content: `Sometimes I need to come back to first principles. Why am I building a writing app when so many already exist?

The honest answer: because I needed something that didn't exist. I journal in the morning, but I never go back to read what I wrote. The journals pile up. The insights get buried.

What I wanted was a system that would help me surface patterns, make connections, turn raw thoughts into structured knowledge. Not just storage - transformation.

The other writing apps I tried were either too simple (basic notes) or too complex (Notion with its databases and templates). I wanted something that felt like journaling but acted like a second brain.

I think there's a deeper reason too. Writing is how I think. When I write, I discover what I believe. The app isn't just a product - it's a thinking tool for myself. I'm building the thing I need.

This reminds me why the dream editor concept feels right. The fading words create forward momentum. You can't edit yourself while you write. It's pure capture, which is what morning pages should be.

Is this a product anyone else will want? I don't know. But I know I want it, and I trust that means others might too.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['why build this', 'personal motivation', 'writing as thinking'],
        contentMustContain: ['writing', 'thinking', 'first principles', 'surface patterns'],
        purposePattern: /I am keeping this because.*(motivation|why|building)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Evergreen' as NoteStatus,
        expectedType: 'Logic' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#decision/personal'],
        forbiddenTags: ['#motivation', '#writing'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Writing as Thinking]]', '[[Product Vision]]'],
        isSynthesis: true,
        synthesisIndicators: ['first principles', 'building the thing I need', 'deeper reason'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      contentType: 'journal-entry',
      themes: ['motivation', 'product', 'vision'],
    },
  },
  {
    id: 'reflect-005',
    title: 'The Comparison Trap',
    content: `I made the mistake of browsing Indie Hackers today. Saw someone launch a note-taking app that got 500 upvotes on Product Hunt. My first reaction: jealousy. My second reaction: despair. Why am I even trying?

Then I took a breath and looked at what they actually built. It's nice, but it's also very different from what I'm making. They're building a Notion competitor. I'm building something more personal, more journaling-focused.

There's a quote I keep coming back to: "Comparison is the thief of joy." But I think comparison to others is the wrong comparison. The useful comparison is me today vs. me yesterday. Am I making progress? Am I learning? Am I building something meaningful to me?

By that measure, I'm doing fine. Three months ago I didn't know React. Today I built a custom text editor with animated word fading. That's real growth.

The person on Indie Hackers didn't steal anything from me. Their success doesn't diminish mine. There's room for many note apps. There's room for my weird dream editor.

Tomorrow I'm going to try a social media fast. Just for a day. See how it affects my mood and focus.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['comparison trap', 'healthy comparison', 'progress mindset'],
        contentMustContain: ['comparison', 'progress', 'growth', 'yesterday'],
        purposePattern: /I am keeping this because.*(comparison|progress|mindset)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/reflect'],
        forbiddenTags: ['#comparison', '#mindset'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Progress Mindset]]', '[[Social Media Impact]]'],
        isSynthesis: true,
        synthesisIndicators: ['useful comparison', 'thief of joy', 'real growth'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'simple',
      contentType: 'journal-entry',
      themes: ['mindset', 'comparison', 'self-compassion'],
    },
  },
  {
    id: 'reflect-006',
    title: 'On Perfectionism and Shipping',
    content: `The dashboard has been "almost done" for two weeks now.

Every time I'm about to ship, I find one more thing to fix. The spacing is off. The loading state isn't smooth enough. The empty state needs better copy.

I recognize this pattern. It's perfectionism disguised as quality. I'm not improving the product - I'm avoiding the vulnerability of shipping something imperfect.

Here's what I know intellectually: feedback from real users is worth 100x more than my own nitpicking. The only way to learn what matters is to put it in front of people and see what they actually notice.

Here's what I feel emotionally: terror. What if they hate it? What if the code breaks? What if I'm not a real developer?

The gap between intellectual knowing and emotional feeling is where all my problems live.

Today I'm going to ship the dashboard. Not because it's perfect. Not even because it's good enough. But because shipping is the only way forward. Perfect is the enemy of done.

I'll set a timer for one hour. Fix only bugs that would prevent basic functionality. Then deploy.

Here goes nothing.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['perfectionism', 'shipping fear', 'done vs perfect'],
        contentMustContain: ['perfectionism', 'shipping', 'feedback', 'vulnerability'],
        purposePattern: /I am keeping this because.*(perfectionism|shipping|feedback)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#decision/personal'],
        forbiddenTags: ['#perfectionism', '#shipping'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Shipping Culture]]', '[[User Feedback]]'],
        isSynthesis: true,
        synthesisIndicators: ['intellectual vs emotional', 'enemy of done', 'only way forward'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      contentType: 'journal-entry',
      themes: ['perfectionism', 'shipping', 'fear'],
    },
  },
  {
    id: 'reflect-007',
    title: 'The Energy Audit',
    content: `I tracked my energy levels throughout the day for a week. Here's what I learned:

Morning (6-10am): High energy, high focus. This is when I do my best deep work. Coding, writing, problem-solving all flow easier. Interruptions in this window cost me disproportionately.

Late morning (10am-12pm): Still good energy but easier to break focus. Good for meetings, reviews, lighter tasks. Not ideal for starting something new.

Afternoon (1-3pm): The slump. Energy tanks after lunch. I used to fight this with caffeine, but that just made me jittery and still unfocused. Better to work with it - do admin tasks, respond to messages, take a walk.

Late afternoon (3-5pm): Second wind. Not as sharp as morning but more creative. Good for exploring ideas, brainstorming, writing rough drafts.

Evening (after 6pm): Depends on the day. If I've been good about breaks, I can sometimes do focused work. If I've pushed through, I'm useless.

The insight: I've been scheduling my days wrong. I've been putting meetings in the morning because that's "professional." But I should be protecting mornings for deep work and moving meetings to late morning or afternoon.

Also: the quality of my sleep directly predicts the quality of my energy. Non-negotiable 7+ hours.

Going to restructure my calendar based on this.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['energy management', 'time blocking', 'deep work'],
        contentMustContain: ['energy', 'morning', 'focus', 'deep work'],
        purposePattern: /I am keeping this because.*(energy|schedule|focus)/i,
        expectedProject: null,
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/plan'],
        forbiddenTags: ['#energy', '#productivity'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Deep Work]]', '[[Energy Management]]'],
        isSynthesis: true,
        synthesisIndicators: ['tracked for a week', 'scheduling wrong', 'insight'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      contentType: 'self-experiment',
      themes: ['productivity', 'energy', 'self-awareness'],
    },
  },
  {
    id: 'reflect-008',
    title: 'Gratitude Practice Day 7',
    content: `A week into the gratitude practice. The skeptic in me expected nothing to change. The optimist hoped for transformation. Reality is somewhere in between.

Three things I'm grateful for today:
1. The bug that taught me about iOS focus requirements. Frustrating but educational.
2. A quiet morning with no Slack messages.
3. The friend who texted just to check in. No reason, just human connection.

What I'm noticing: I'm not necessarily happier, but I'm more... aware? The practice forces me to look for good things, which means I notice them when they happen. Before, good things would happen and I'd immediately move on. Now there's a moment of pause.

The cynical part of me says this is just confirmation bias. I'm looking for positives so I find them. But is that so bad? If the alternative is looking for negatives and finding those instead?

Also noticing: my three gratitudes are often small things. Not "I got a promotion" but "I had a nice cup of coffee." This feels healthy. It means I'm not dependent on big wins for contentment.

Will I keep doing this? Ask me in another week. But so far, cautiously optimistic.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['gratitude practice', 'awareness', 'small things'],
        contentMustContain: ['gratitude', 'aware', 'small', 'practice'],
        purposePattern: /I am keeping this because.*(gratitude|awareness|practice)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/habit', '#insight/core'],
        forbiddenTags: ['#gratitude', '#wellbeing'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Gratitude Practice]]', '[[Awareness]]'],
        isSynthesis: true,
        synthesisIndicators: ['what I\'m noticing', 'not dependent on big wins', 'cautiously optimistic'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'simple',
      contentType: 'gratitude-journal',
      themes: ['gratitude', 'mindfulness', 'wellbeing'],
    },
  },
  {
    id: 'reflect-009',
    title: 'Learning in Public - Why I Started Writing Technical Docs',
    content: `Something changed when I started documenting my technical decisions. Not for anyone else - for myself.

The act of writing forces clarity. When I implement something, I often have a vague sense of why it works. When I write about it, I have to articulate the reasoning. Half the time, writing reveals that my understanding was incomplete.

Example: I thought I understood D3 force layouts. Then I tried to write documentation. I realized I'd been copy-pasting configuration without knowing what the numbers meant. Writing made me actually learn it.

There's another benefit too. The documentation becomes a gift to my future self. Six months from now, I'll have forgotten why I chose Supabase over Firebase. Having the ADR means I don't have to re-derive the decision - I can just read my past reasoning.

This connects to the Zettelkasten idea of writing for your future self. You're not just storing information. You're creating a dialogue across time.

I want to do more of this. Not just documenting decisions, but documenting what I learn. Turning tacit knowledge (what I intuitively understand) into explicit knowledge (what I can articulate and share).

Maybe this is what "learning in public" actually means. Not performing expertise, but processing understanding.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['learning in public', 'writing for clarity', 'documentation value'],
        contentMustContain: ['writing', 'clarity', 'documentation', 'future self'],
        purposePattern: /I am keeping this because.*(writing|learning|clarity)/i,
        expectedProject: null,
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Logic' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#decision/personal'],
        forbiddenTags: ['#learning', '#writing'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Learning in Public]]', '[[Zettelkasten Method]]'],
        isSynthesis: true,
        synthesisIndicators: ['forces clarity', 'gift to future self', 'processing understanding'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      contentType: 'journal-entry',
      themes: ['learning', 'documentation', 'knowledge-management'],
    },
  },
  {
    id: 'reflect-010',
    title: 'Dealing with Decision Fatigue',
    content: `I made 47 decisions today. Most were small (what font size? which variable name? left or right margin?) but they add up.

By 4pm I couldn't decide anything. Someone asked if I wanted to grab coffee and I literally couldn't answer. Not because I didn't want coffee, but because making one more decision felt impossible.

This is decision fatigue and it's real. The brain treats decisions as a limited resource. Use them up on small stuff and you have nothing left for big stuff.

What to do about it? I've read about decision reduction:
- Wear the same clothes every day (tech bro uniform)
- Eat the same breakfast
- Have routines that remove decisions

But I don't want a life without variety. There must be a middle way.

My hypothesis: batch similar decisions. Instead of deciding pixel-by-pixel, establish a design system with predetermined sizes. Instead of choosing what to work on each morning, plan the week on Sunday.

The principle: decide once, use many times.

I'm going to experiment with this. Create a "decision budget" of sorts - save the fresh decisions for things that matter, and use pre-made decisions for everything else.

Also: earlier bed time. Decisions are harder when tired.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['decision fatigue', 'decision batching', 'cognitive load'],
        contentMustContain: ['decision', 'fatigue', 'batch', 'routine'],
        purposePattern: /I am keeping this because.*(decision|fatigue|batch)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/experiment'],
        forbiddenTags: ['#decisions', '#productivity'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Decision Fatigue]]', '[[Cognitive Load]]'],
        isSynthesis: true,
        synthesisIndicators: ['hypothesis', 'decide once use many', 'experiment'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      contentType: 'journal-entry',
      themes: ['productivity', 'decisions', 'self-management'],
    },
  },
  {
    id: 'reflect-011',
    title: 'The Fear of Starting Over',
    content: `I realized today that some of my resistance to refactoring comes from fear. Not fear of the work, but fear of invalidating what I've already done.

If I rewrite the state management, does that mean the old approach was wrong? If it was wrong, what does that say about my judgment? If my judgment is bad, how can I trust any of my decisions?

This is catastrophic thinking at its finest. The reality is much simpler: I made good decisions with the information I had. Now I have more information. Better decisions are possible.

This connects to something in software development: the idea that code should be easy to change. Not because change is bad, but because change is inevitable. Requirements shift, understanding deepens, better patterns emerge.

The same is true for personal development. The person I was yesterday made the best decisions they could. The person I am today has new data. Growth isn't invalidation - it's iteration.

I want to hold my decisions more lightly. Not with carelessness, but with openness. "This is the best I know right now" instead of "this is the final answer."

Today I'm going to refactor the coaching state machine. Not because it was wrong, but because I've learned better patterns.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['fear of change', 'iteration mindset', 'growth vs invalidation'],
        contentMustContain: ['change', 'fear', 'iteration', 'growth'],
        purposePattern: /I am keeping this because.*(change|growth|iteration)/i,
        expectedProject: null,
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/reflect'],
        forbiddenTags: ['#change', '#growth'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Growth Mindset]]', '[[Code as Craft]]'],
        isSynthesis: true,
        synthesisIndicators: ['catastrophic thinking', 'growth isn\'t invalidation', 'hold lightly'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      contentType: 'journal-entry',
      themes: ['change', 'fear', 'growth'],
    },
  },
  {
    id: 'reflect-012',
    title: 'What Flow State Actually Feels Like',
    content: `Had three hours of flow today. Rare and precious.

I want to capture what it felt like while it's fresh:
- Time disappeared. I looked up and three hours had passed.
- No internal monologue. The usual chatter in my head went quiet.
- Challenges were fun, not frustrating. Each problem was a puzzle to solve.
- Actions felt automatic. I wasn't thinking about typing - I was thinking in code.
- Zero self-consciousness. No "am I doing this right?" just doing.

What enabled it:
- Clear goal (fix the graph boundary issue)
- Right level of difficulty (hard enough to engage, not so hard I got stuck)
- No interruptions (phone in another room, Slack closed)
- Good energy (slept well, had coffee but not too much)

What broke it:
- Nothing. It ended naturally when I solved the problem.
- Though honestly, I think it would have broken if someone had messaged me.

This is what I'm building for with the dream editor. The fading words create forward momentum. The minimal UI removes distractions. The goal is to enable flow for writing the way I experienced it for coding today.

I can't manufacture flow. But I can create conditions that make it more likely.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['flow state', 'optimal experience', 'flow conditions'],
        contentMustContain: ['flow', 'time', 'challenge', 'conditions'],
        purposePattern: /I am keeping this because.*(flow|experience|conditions)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/reflect'],
        forbiddenTags: ['#flow', '#productivity'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Flow State]]', '[[Deep Work]]'],
        isSynthesis: true,
        synthesisIndicators: ['what it felt like', 'what enabled it', 'create conditions'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      contentType: 'journal-entry',
      themes: ['flow', 'productivity', 'experience'],
    },
  },
  {
    id: 'reflect-013',
    title: 'On Receiving Feedback',
    content: `Got my first real user feedback today. My friend tried the app and... she didn't love it.

Her feedback: "I don't understand what I'm supposed to do. The words fading is cool but also kind of stressful. Where's my writing going?"

My initial reaction: defensiveness. She doesn't get it. She's not the target user. The vision is correct, she just needs time.

My second reaction: curiosity. What if she's right? What if the vision is clear in my head but not in the product? What if "cool but stressful" is the wrong vibe?

Sitting with both reactions, I realize: feedback is data, not judgment. She's not saying I'm a bad developer. She's saying her experience didn't match my intentions.

The useful question isn't "is she right or wrong?" It's "what can I learn from this gap between intention and experience?"

Specific learnings:
1. Need onboarding. First-time users don't know the concept.
2. "Where's my writing going?" suggests trust issues. Need visible save indicator.
3. "Stressful" is the opposite of what I want. Maybe fading should be optional or adjustable.

I'm grateful she was honest. Kind feedback that avoids the truth doesn't help me build something good.

Tomorrow: add onboarding modal and save indicator. Small steps toward the vision.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['receiving feedback', 'user feedback', 'defensiveness to curiosity'],
        contentMustContain: ['feedback', 'defensiveness', 'curiosity', 'learn'],
        purposePattern: /I am keeping this because.*(feedback|learn|curiosity)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/reflect'],
        forbiddenTags: ['#feedback', '#users'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[User Feedback]]', '[[Growth Mindset]]'],
        isSynthesis: true,
        synthesisIndicators: ['feedback is data', 'gap between intention and experience', 'grateful for honesty'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      contentType: 'journal-entry',
      themes: ['feedback', 'growth', 'product'],
    },
  },
  {
    id: 'reflect-014',
    title: 'Sunday Review - Week 12',
    content: `End of week review. Taking stock.

What went well:
- Fixed three major bugs (keyboard, scrollbar, graph boundaries)
- Shipped onboarding modal
- Had one day of real flow state
- Started the gratitude practice

What didn't go well:
- Only worked on the product 4 days out of 7
- Spent too much time on Twitter/Reddit
- Didn't exercise at all
- The extraction accuracy work is stalled

What I learned:
- iOS has weird focus requirements (documented in tech notes)
- CSS overflow needs careful management in nested layouts
- I work better in the morning, should protect that time
- User feedback is uncomfortable but valuable

Focus for next week:
1. Extraction accuracy - this is blocking the main value prop
2. Exercise minimum 3 times
3. Social media limit: 30 min/day max
4. Protect morning focus time

Mood overall: 6/10. Progress is happening but slower than I'd like. The extraction work is weighing on me - it's complex and I keep avoiding it.

Commitment: Start Monday with extraction, even if it's hard. Eat the frog first.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['weekly review', 'reflection practice', 'self-assessment'],
        contentMustContain: ['review', 'went well', 'learned', 'focus'],
        purposePattern: /I am keeping this because.*(review|reflection|progress)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/review', '#insight/core'],
        forbiddenTags: ['#review', '#weekly'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Weekly Review]]', '[[Self-Assessment]]'],
        isSynthesis: true,
        synthesisIndicators: ['what I learned', 'focus for next week', 'eat the frog'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'simple',
      contentType: 'weekly-review',
      themes: ['review', 'reflection', 'planning'],
    },
  },
  {
    id: 'reflect-015',
    title: 'The Weight of Unfinished Projects',
    content: `I counted today. I have 7 unfinished projects on my hard drive.

A half-built habit tracker. A recipe app I started and abandoned. Two different attempts at a personal website. A Chrome extension that's 70% done. A CLI tool I built for myself but never polished. And now this writing app.

Each one carries a small weight. A little voice that whispers "you never finish things." The graveyard of good intentions.

But here's what I'm realizing: those projects aren't failures. They're experiments. Each one taught me something.

The habit tracker taught me React basics. The recipe app taught me about data modeling. The Chrome extension taught me about browser APIs. Even the abandoned ones had value.

The question isn't "why do I have so many unfinished projects?" It's "what makes this one different?"

The answer, I think, is personal stake. I don't just want a writing app - I need one. I use it every day to write these journal entries. It's not a theoretical product; it's a tool I'm building for myself.

That's the difference. The unfinished projects were exploring possibilities. This one is solving my problem.

I'm going to let go of the guilt about those other projects. They served their purpose. This one gets my focus.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['unfinished projects', 'project guilt', 'experiments vs commitment'],
        contentMustContain: ['unfinished', 'projects', 'experiments', 'personal stake'],
        purposePattern: /I am keeping this because.*(unfinished|projects|commitment)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/reflect'],
        forbiddenTags: ['#projects', '#productivity'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Project Selection]]', '[[Personal Motivation]]'],
        isSynthesis: true,
        synthesisIndicators: ['what makes this one different', 'served their purpose', 'let go of guilt'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      contentType: 'journal-entry',
      themes: ['projects', 'commitment', 'reflection'],
    },
  },
  {
    id: 'reflect-016',
    title: 'Conversations with My Inner Critic',
    content: `Noticed my inner critic was particularly loud today. Decided to write out the conversation.

Critic: "You're not a real developer. Real developers don't take this long to build simple features."

Me: "What makes someone a 'real' developer?"

Critic: "They ship fast. They know everything. They don't get stuck on basic CSS."

Me: "Do you know any developers who never get stuck?"

Critic: "... No."

Me: "So what's the real standard you're holding me to?"

Critic: "I don't know. Some ideal version that doesn't struggle."

Me: "Does that person exist?"

Critic: "Maybe not."

Me: "So you're comparing me to an imaginary person who doesn't exist, and then feeling bad when I don't measure up?"

Critic: "When you put it that way..."

This dialogue helped. The critic loses power when examined directly. Its standards are impossible because they're not based on reality - they're based on an imagined perfection that no one achieves.

What if the critic isn't an enemy to fight, but a scared part of me that needs reassurance? It's not trying to hurt me - it's trying to protect me from failure by making sure I never try.

"Thank you for trying to protect me. We're going to be okay. We can try and fail and still be okay."`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['inner critic', 'self-compassion', 'internal dialogue'],
        contentMustContain: ['critic', 'dialogue', 'protect', 'compassion'],
        purposePattern: /I am keeping this because.*(critic|self-compassion|dialogue)/i,
        expectedProject: null,
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/reflect'],
        forbiddenTags: ['#mindset', '#self-help'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Inner Critic]]', '[[Self-Compassion]]'],
        isSynthesis: true,
        synthesisIndicators: ['loses power when examined', 'trying to protect', 'thank you for trying'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      contentType: 'journal-entry',
      themes: ['inner-critic', 'self-compassion', 'mindset'],
    },
  },
  {
    id: 'reflect-017',
    title: 'The Value of Boredom',
    content: `I banned myself from my phone for a day. No podcasts during walks. No scrolling during meals. No checking anything "real quick."

What happened: I got bored. Really bored.

And then something interesting happened. The boredom became generative. Ideas started to surface that had been drowned out by the constant input.

Walking without a podcast, I thought about the extraction algorithm problem. By the time I got home, I had a new approach to try.

Eating without scrolling, I noticed I was actually tasting my food. Also noticed I was eating faster than I needed to - why rush when there's nothing waiting?

The evening was hardest. The urge to pick up the phone was physical, like an itch. But I sat with it, and eventually the urge passed. I read a book instead. An actual paper book.

The insight: my brain needs whitespace to process. Constant stimulation leaves no room for synthesis. The boredom wasn't empty - it was fertile.

I'm not going to ban my phone permanently. But I want more intentional boredom. Maybe one "no phone walk" per day. Maybe meals without screens.

The app can wait. My thoughts need space to breathe.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['boredom value', 'digital detox', 'generative boredom'],
        contentMustContain: ['boredom', 'phone', 'ideas', 'whitespace'],
        purposePattern: /I am keeping this because.*(boredom|whitespace|detox)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/experiment'],
        forbiddenTags: ['#boredom', '#phone'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Digital Detox]]', '[[Cognitive Whitespace]]'],
        isSynthesis: true,
        synthesisIndicators: ['boredom became generative', 'brain needs whitespace', 'fertile not empty'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'simple',
      contentType: 'experiment-log',
      themes: ['boredom', 'creativity', 'digital-wellness'],
    },
  },
  {
    id: 'reflect-018',
    title: 'When Help-Seeking Becomes Avoidance',
    content: `I spent two hours today searching Stack Overflow for solutions to a problem that, in hindsight, I probably could have solved myself in one hour.

There's a pattern here. When I hit a hard problem, my first instinct is to look for how someone else solved it. This feels productive - I'm researching! I'm learning from others! But sometimes it's actually avoidance. I'm avoiding the discomfort of thinking hard.

The irony: the solutions I find online rarely fit perfectly. I have to modify them anyway. And in the process of modifying, I end up doing the thinking I was trying to avoid.

Worse: when I copy a solution I don't fully understand, I create technical debt. Future-me will have to figure out why this code works, and past-me won't be there to help.

New rule: 30 minutes of genuine thinking before searching. Not passive "hmm this is hard" thinking, but active "let me break this down and try something" thinking.

The goal isn't to never seek help. It's to develop judgment about when help is actually needed vs. when I'm just uncomfortable with the struggle.

Sometimes the struggle IS the learning.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['help-seeking', 'avoidance behavior', 'struggle as learning'],
        contentMustContain: ['help', 'avoidance', 'thinking', 'struggle'],
        purposePattern: /I am keeping this because.*(avoidance|struggle|learning)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#decision/personal'],
        forbiddenTags: ['#learning', '#help'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Learning Strategies]]', '[[Productive Struggle]]'],
        isSynthesis: true,
        synthesisIndicators: ['avoidance', 'new rule', 'struggle IS the learning'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      contentType: 'journal-entry',
      themes: ['learning', 'avoidance', 'self-awareness'],
    },
  },
  {
    id: 'reflect-019',
    title: 'Identity vs Behavior',
    content: `I've been calling myself "a person who doesn't exercise." This framing is a problem.

When exercise is about identity ("I'm not a fit person"), every skipped workout reinforces who I am. And every attempt to exercise feels like fighting against my nature.

But what if I reframed? What if I'm "a person who is learning to exercise"?

Now a skipped workout is just a skipped workout - not evidence of who I am. And exercising isn't fighting my nature - it's building a new skill.

This connects to Carol Dweck's work on fixed vs growth mindset, but it feels different when I apply it to myself rather than reading about it.

The identity trap shows up everywhere:
- "I'm not a morning person" → or maybe I haven't optimized my evenings yet
- "I'm bad at CSS" → or maybe I haven't practiced it enough
- "I'm not the kind of person who ships" → or maybe I need better systems

The shift: from "this is who I am" to "this is what I'm doing (and it can change)."

I'm going to be more careful about identity statements. They feel true but they're actually predictions - and predictions can be wrong.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['identity vs behavior', 'growth mindset', 'self-limiting beliefs'],
        contentMustContain: ['identity', 'behavior', 'mindset', 'change'],
        purposePattern: /I am keeping this because.*(identity|mindset|change)/i,
        expectedProject: null,
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/reflect'],
        forbiddenTags: ['#mindset', '#identity'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Growth Mindset]]', '[[Identity Formation]]'],
        isSynthesis: true,
        synthesisIndicators: ['reframed', 'identity trap', 'predictions can be wrong'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      contentType: 'journal-entry',
      themes: ['identity', 'mindset', 'change'],
    },
  },
  {
    id: 'reflect-020',
    title: 'What Kind of Life Am I Building?',
    content: `Zooming out today. Not thinking about code or features, but about the shape of my life.

I've spent the last three months mostly alone, working on this app. Is this what I want? Is this sustainable?

On one hand: I'm learning so much. I'm building something that matters to me. I have freedom and autonomy that employed-me never had.

On the other hand: I'm isolated. My social skills are atrophying. I sometimes don't speak to another human for days. The app has become everything, which means nothing else can compete for my attention.

What kind of life am I actually building?

I think I want a life with:
- Meaningful work (creating, not just consuming)
- Deep relationships (few but genuine)
- Physical health (not sacrificed for productivity)
- Financial stability (enough, not excess)
- Room for surprise (not everything optimized)

Currently I'm overweighted on meaningful work and underweighted on everything else. The app is important but it's not everything.

This week I'm going to:
1. Reach out to two friends I've been neglecting
2. Exercise three times
3. Take one day completely off from the app

The building continues. But so does the builder.`,
    sourceType: 'reflective',
    expectedNotes: [
      {
        titlePatterns: ['life design', 'work-life balance', 'sustainable building'],
        contentMustContain: ['life', 'building', 'sustainable', 'balance'],
        purposePattern: /I am keeping this because.*(life|balance|sustainable)/i,
        expectedProject: null,
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#decision/personal'],
        forbiddenTags: ['#life', '#balance'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Life Design]]', '[[Sustainable Pace]]'],
        isSynthesis: true,
        synthesisIndicators: ['zooming out', 'what kind of life', 'building continues, so does builder'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      contentType: 'journal-entry',
      themes: ['life-design', 'balance', 'sustainability'],
    },
  },
]

// =============================================================================
// PLANNING DOCUMENTS (1-15)
// =============================================================================

export const PLANNING_DOCUMENTS: ContentFixture[] = [
  {
    id: 'plan-001',
    title: 'Q1 Product Roadmap',
    content: `# Q1 Product Roadmap

## Vision
By end of Q1, the Writing UI should be a functional daily writing companion that extracts knowledge from journal entries.

## Key Results
1. 5 active daily users (including myself)
2. 80% extraction accuracy on test corpus
3. Zero data loss incidents
4. Mobile experience as good as desktop

## January Priorities

### Week 1-2: Foundation
- [ ] Fix critical bugs (keyboard, scrollbar)
- [ ] Add onboarding for new users
- [ ] Implement auto-save with visual feedback
- [ ] Deploy to production environment

### Week 3-4: Core Experience
- [ ] Improve mobile keyboard handling
- [ ] Add "Inspire me" button for prompts
- [ ] Polish the dream editor animations
- [ ] User testing with 3 people

## February Priorities

### Week 5-6: Knowledge Extraction
- [ ] Implement extraction accuracy test harness
- [ ] Reach 70% accuracy baseline
- [ ] Add note consolidation (merge duplicates)
- [ ] Build note quality scoring (NVQ)

### Week 7-8: Graph & Connections
- [ ] Add bidirectional links
- [ ] Improve graph visualization
- [ ] Implement tag suggestions
- [ ] Cross-document connection discovery

## March Priorities

### Week 9-10: Goal Integration
- [ ] Connect notes to goals automatically
- [ ] Momentum meter based on note activity
- [ ] Daily review of surfaced insights

### Week 11-12: Polish & Launch Prep
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Documentation
- [ ] Soft launch to friends

## Risks
1. Extraction accuracy may be harder than expected
2. Mobile experience has many edge cases
3. Solo development limits velocity
4. Scope creep from too many ideas

## Mitigation
- Timebox extraction work; ship "good enough"
- Test on real devices early and often
- Ruthlessly prioritize; say no to nice-to-haves
- Keep a "parking lot" for future ideas`,
    sourceType: 'planning',
    expectedNotes: [
      {
        titlePatterns: ['Q1 roadmap', 'product planning', 'quarterly goals'],
        contentMustContain: ['roadmap', 'priorities', 'key results'],
        purposePattern: /I am keeping this because.*(planning|roadmap|priorities)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Logic' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/plan', '#decision/technical'],
        forbiddenTags: ['#roadmap', '#planning'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Product Strategy]]', '[[Quarterly Planning]]'],
        isSynthesis: true,
        synthesisIndicators: ['vision', 'key results', 'risks', 'mitigation'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      contentType: 'roadmap',
      themes: ['planning', 'product', 'strategy'],
    },
  },
  {
    id: 'plan-002',
    title: 'Knowledge Extraction Architecture Plan',
    content: `# Knowledge Extraction Architecture

## Current State
- Documents go into the system
- No structured extraction happens
- User must manually create atomic notes

## Target State
- Documents are automatically analyzed
- Atomic notes are extracted with high accuracy
- Notes are connected across documents
- Similar notes are consolidated

## Architecture Overview

### Pipeline Stages

1. **Document Ingestion**
   - Receive document from save event
   - Add to extraction queue
   - Update status to "pending"

2. **Pre-processing**
   - Clean text (remove formatting artifacts)
   - Chunk long documents (max 2000 words)
   - Identify document type (journal, technical, etc.)

3. **Context Retrieval**
   - Query existing notes for relevant context
   - Get user's active goals
   - Retrieve recent extraction patterns

4. **Extraction (Claude API)**
   - Send chunk + context to Claude
   - Extract atomic notes with metadata
   - Generate connections to existing notes

5. **Post-processing**
   - Deduplicate against existing notes
   - Consolidate similar notes
   - Validate output format

6. **Persistence**
   - Save notes to database
   - Create connections in graph
   - Update note history

### Key Decisions

**Why Claude over GPT-4?**
- Better at structured output
- Lower hallucination rate in my testing
- Consistent JSON generation

**Why chunking?**
- API token limits
- Faster parallel processing
- Better accuracy on focused content

**Why context retrieval before extraction?**
- Enables connection discovery
- Prevents duplicate extraction
- Personalizes to user's knowledge base

### Quality Measures

- Extraction accuracy: precision/recall on test corpus
- Note quality (NVQ): structure and usefulness
- Connection rate: % of notes with cross-doc links
- Consolidation accuracy: correct merge rate

### Open Questions

1. How to handle contradictions between notes?
2. When to merge vs. keep separate?
3. How much context is too much context?
4. How to handle extraction of code/technical content?`,
    sourceType: 'planning',
    expectedNotes: [
      {
        titlePatterns: ['extraction architecture', 'knowledge pipeline', 'extraction design'],
        contentMustContain: ['pipeline', 'extraction', 'architecture', 'stages'],
        purposePattern: /I am keeping this because.*(architecture|extraction|design)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/plan', '#decision/technical'],
        forbiddenTags: ['#architecture', '#extraction'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Knowledge Extraction]]', '[[AI Pipeline Design]]'],
        isSynthesis: true,
        synthesisIndicators: ['current vs target state', 'key decisions', 'open questions'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      contentType: 'architecture-plan',
      themes: ['architecture', 'ai', 'extraction'],
    },
  },
  {
    id: 'plan-003',
    title: 'Mobile Experience Improvement Plan',
    content: `# Mobile Experience Improvement Plan

## Problem Statement
Mobile users report a significantly worse experience than desktop users:
- Keyboard issues
- Layout problems
- Touch targets too small
- Performance slower

## Success Criteria
- Mobile and desktop should feel equally polished
- No mobile-specific bugs in critical paths
- Touch targets meet 44px minimum
- First contentful paint under 2 seconds

## Phase 1: Critical Fixes (Week 1)

### P0 - Blocking Issues
1. **Keyboard not appearing**
   - Root cause: programmatic focus outside gesture
   - Fix: move focus() to direct gesture handler
   - Testing: iOS Safari, Chrome Android

2. **Content pushed off screen**
   - Root cause: viewport doesn't account for keyboard
   - Fix: use visualViewport API
   - Fallback: CSS env(safe-area-inset-*)

### P1 - Major Issues
3. **Double scrollbar in editor**
   - Fix: single scroll container

4. **Tiny touch targets on goal cards**
   - Fix: increase button sizes to 44px min

## Phase 2: Polish (Week 2)

### Layout Improvements
- Responsive typography (clamp())
- Better spacing on small screens
- Stack layouts instead of side-by-side

### Performance
- Lazy load graph component
- Reduce initial bundle size
- Optimize images with next/image

### Touch Interactions
- Add swipe gestures for navigation
- Long-press context menus
- Pull-to-refresh on lists

## Phase 3: Parity (Week 3)

### Feature Parity
- Mobile graph visualization
- Mobile coaching experience
- Mobile document list

### Testing
- Test on real devices (not just simulators)
- Test with screen readers
- Test with large font sizes

## Device Matrix

| Device | OS | Browser | Priority |
|--------|-----|---------|----------|
| iPhone 14 | iOS 17 | Safari | P0 |
| iPhone SE | iOS 16 | Safari | P1 |
| Pixel 7 | Android 14 | Chrome | P0 |
| Galaxy S21 | Android 12 | Samsung | P1 |

## Risks
- iOS and Android have different keyboard behaviors
- Testing matrix is large
- May need native features eventually (PWA limits)`,
    sourceType: 'planning',
    expectedNotes: [
      {
        titlePatterns: ['mobile improvement', 'responsive design', 'mobile fixes'],
        contentMustContain: ['mobile', 'keyboard', 'touch', 'responsive'],
        purposePattern: /I am keeping this because.*(mobile|responsive|touch)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#task/plan', '#UI/responsive'],
        forbiddenTags: ['#mobile', '#responsive'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Mobile-First Design]]', '[[Touch Interactions]]'],
        isSynthesis: true,
        synthesisIndicators: ['problem statement', 'success criteria', 'phased approach'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      contentType: 'improvement-plan',
      themes: ['mobile', 'ux', 'responsive'],
    },
  },
  {
    id: 'plan-004',
    title: 'Testing Strategy Document',
    content: `# Testing Strategy

## Philosophy
We prioritize integration tests over unit tests. The goal is confidence in user-facing behavior, not implementation coverage.

## Test Pyramid (Inverted)

  E2E Tests           20% - Critical user journeys
  Integration Tests   60% - Component + API behavior
  Unit Tests          20% - Pure logic only

## E2E Test Coverage

### Critical Paths (must not break)
1. User can sign up and log in
2. User can write and save a document
3. User can create and update goals
4. User can view knowledge graph

### Secondary Paths
5. User can start coaching session
6. User can search documents
7. User can export document

## Integration Test Coverage

### Hooks
- useAutoSave: debouncing, error recovery
- useGoals: CRUD operations
- useKnowledgeGraph: data fetching, filtering

### Components
- DreamEditor: text input, fading animation
- GoalCoach: stage transitions, streaming
- KnowledgeGraph: node/edge rendering

### API Routes
- /api/ai/extract: extraction pipeline
- /api/ai/coach: streaming responses
- /api/ai/prompt: prompt generation

## Unit Test Coverage

### Pure Functions
- Text parsing utilities
- State machine transitions
- Score calculations

## Test Infrastructure

### Tools
- Playwright for E2E
- Vitest for unit/integration
- Testing Library for component tests

### CI Pipeline
test:
  - name: Unit + Integration (vitest run, 5m timeout)
  - name: E2E (playwright test, 15m timeout, on pull_request)

### Test Data
- Fixtures in tests/fixtures/
- Factory functions for common entities
- Test user in Supabase

## Quality Gates
- Must pass all tests before merge
- Coverage cannot decrease
- E2E must pass on Chrome + Safari`,
    sourceType: 'planning',
    expectedNotes: [
      {
        titlePatterns: ['testing strategy', 'test pyramid', 'QA approach'],
        contentMustContain: ['testing', 'E2E', 'integration', 'coverage'],
        purposePattern: /I am keeping this because.*(testing|quality|coverage)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/plan', '#skill/testing'],
        forbiddenTags: ['#testing', '#qa'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Test Pyramid]]', '[[Quality Assurance]]'],
        isSynthesis: true,
        synthesisIndicators: ['philosophy', 'inverted pyramid', 'quality gates'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      contentType: 'strategy-doc',
      themes: ['testing', 'quality', 'ci-cd'],
    },
  },
  {
    id: 'plan-005',
    title: 'User Research Plan',
    content: `# User Research Plan

## Objective
Understand how people currently journal and manage their knowledge, to validate and refine product direction.

## Research Questions
1. What triggers people to write/journal?
2. How do they organize their notes?
3. What do they do with insights after writing?
4. What's frustrating about current tools?
5. Would automated extraction be valuable?

## Methodology

### Phase 1: Discovery Interviews (5 users)

**Profile**: People who journal at least weekly

**Script outline**:
1. Tell me about your journaling practice
2. Walk me through what you wrote recently
3. How do you organize or find old entries?
4. Have you ever had an insight from journaling?
5. What tools have you tried? What worked/didn't?

**Logistics**:
- 30-45 min video calls
- Record with permission
- Synthesize into themes

### Phase 2: Usability Testing (5 users)

**Tasks**:
1. Write a short journal entry
2. Find something you wrote before
3. Understand the knowledge graph
4. Create a goal and talk to the coach

**Metrics**:
- Task completion rate
- Time on task
- Error rate
- Satisfaction (1-5)

**Method**:
- Think-aloud protocol
- Observe, don't guide
- Ask "what did you expect?" on errors

### Phase 3: Diary Study (10 users, 2 weeks)

**Setup**:
- Users journal in the app daily
- End-of-day survey (2 questions)
- Weekly check-in call

**Survey questions**:
1. Did you write today? Why/why not?
2. Rate your experience 1-5

**End interview**:
- What did you like/dislike?
- Would you keep using this?
- What's missing?

## Recruitment

**Criteria**:
- Journals at least weekly
- Has tried digital note tools
- Mix of ages/genders/professions

**Sources**:
- Personal network
- Reddit r/journaling
- Twitter followers

**Compensation**:
- Phase 1/2: $25 gift card
- Phase 3: $100 gift card

## Timeline
- Week 1: Recruit, schedule
- Week 2-3: Discovery interviews
- Week 4: Synthesize, iterate product
- Week 5-6: Usability testing
- Week 7-8: Diary study`,
    sourceType: 'planning',
    expectedNotes: [
      {
        titlePatterns: ['user research', 'research plan', 'user interviews'],
        contentMustContain: ['research', 'interviews', 'usability', 'users'],
        purposePattern: /I am keeping this because.*(research|users|validation)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Logic' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#task/plan', '#task/research'],
        forbiddenTags: ['#research', '#users'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[User Research]]', '[[Product Validation]]'],
        isSynthesis: true,
        synthesisIndicators: ['research questions', 'methodology', 'phased approach'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      contentType: 'research-plan',
      themes: ['research', 'users', 'validation'],
    },
  },
  {
    id: 'plan-006',
    title: 'Error Handling Improvement Plan',
    content: `# Error Handling Improvement Plan

## Current Problems
1. Raw JSON errors shown to users
2. No retry logic on transient failures
3. Inconsistent error messages
4. No error tracking/monitoring

## Goals
1. Users never see raw errors
2. Transient failures retry automatically
3. Error messages are helpful and actionable
4. All errors are logged for debugging

## Implementation Plan

### Layer 1: API Error Handling

Standard error response format:
- ApiError interface with code (string), message (string), retryAfter (optional number)

Error mapping:
- 400 → "Please check your input and try again"
- 401 → "Please sign in again"
- 403 → "You don't have access to this"
- 429 → "Too many requests, please wait"
- 500 → "Something went wrong, please try again"

### Layer 2: Client Error Handling

Wrapper pattern for all API calls:
- apiCall function wraps API calls
- On error, check if retryable
- Retry up to 3 times for transient errors
- Convert to user-friendly error otherwise

### Layer 3: UI Error Display

- Toast for non-blocking errors
- Inline message for form errors
- Full-page for critical errors
- Loading states during retry

### Layer 4: Error Tracking

Integrate error tracking service:
- Capture all unhandled errors
- Include user context (anonymized)
- Group similar errors
- Alert on spike in errors

Options: Sentry, LogRocket, Highlight

## Rollout

Week 1:
- Add error boundary to React tree
- Implement standard error response

Week 2:
- Add retry logic to critical paths
- Update UI error displays

Week 3:
- Integrate error tracking
- Set up alerts
- Test error scenarios

## Success Metrics
- Zero raw errors shown to users
- 95% of transient errors recovered via retry
- Mean time to detect errors < 5 minutes`,
    sourceType: 'planning',
    expectedNotes: [
      {
        titlePatterns: ['error handling', 'error improvement', 'error UX'],
        contentMustContain: ['error', 'retry', 'handling', 'user-friendly'],
        purposePattern: /I am keeping this because.*(error|handling|UX)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#task/plan', '#task/implement'],
        forbiddenTags: ['#errors', '#handling'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Error Handling Patterns]]', '[[User Experience]]'],
        isSynthesis: true,
        synthesisIndicators: ['current problems', 'layered approach', 'success metrics'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      contentType: 'improvement-plan',
      themes: ['error-handling', 'ux', 'reliability'],
    },
  },
  {
    id: 'plan-007',
    title: 'Performance Optimization Roadmap',
    content: `# Performance Optimization Roadmap

## Current Baseline
- First Contentful Paint: 2.8s
- Largest Contentful Paint: 4.2s
- Time to Interactive: 5.1s
- Bundle size: 420KB gzipped

## Target
- FCP: < 1.5s
- LCP: < 2.5s
- TTI: < 3.5s
- Bundle: < 200KB

## Quick Wins (Week 1)

### Image Optimization
- [ ] Convert images to WebP
- [ ] Use next/image for lazy loading
- [ ] Add appropriate sizes attribute

Expected impact: -0.5s LCP

### Font Loading
- [ ] Subset fonts to used characters
- [ ] Add font-display: swap
- [ ] Preload critical fonts

Expected impact: -0.3s FCP

### Third-party Scripts
- [ ] Defer non-critical scripts
- [ ] Remove unused dependencies
- [ ] Lazy load analytics

Expected impact: -0.4s TTI

## Medium Effort (Week 2-3)

### Code Splitting
- [ ] Dynamic import for graph component
- [ ] Route-based code splitting
- [ ] Component-level lazy loading

Target: 50% reduction in initial bundle

### Server Components
- [ ] Convert data-fetching components
- [ ] Move static UI to server
- [ ] Implement streaming SSR

Target: -1s TTI

### Caching
- [ ] Implement stale-while-revalidate
- [ ] Add service worker for offline
- [ ] Cache API responses appropriately

## Major Effort (Week 4+)

### Database Queries
- [ ] Add missing indexes
- [ ] Optimize N+1 queries
- [ ] Implement pagination everywhere

### Real-time Performance
- [ ] Throttle graph updates
- [ ] Virtual scrolling for long lists
- [ ] Web Workers for heavy computation

## Measurement

### Tools
- Lighthouse CI in pipeline
- Web Vitals real user monitoring
- Custom performance marks

### Alerts
- Alert if FCP > 3s
- Weekly performance report
- Compare against baseline

## Dependencies
- Need production data for realistic testing
- Some optimizations may require API changes
- Image CDN might be needed for scale`,
    sourceType: 'planning',
    expectedNotes: [
      {
        titlePatterns: ['performance optimization', 'web vitals', 'performance roadmap'],
        contentMustContain: ['performance', 'FCP', 'bundle', 'optimization'],
        purposePattern: /I am keeping this because.*(performance|optimization|speed)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#task/plan', '#task/optimize'],
        forbiddenTags: ['#performance', '#optimization'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Web Performance]]', '[[Core Web Vitals]]'],
        isSynthesis: true,
        synthesisIndicators: ['baseline vs target', 'quick wins', 'measurement'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      contentType: 'roadmap',
      themes: ['performance', 'optimization', 'web-vitals'],
    },
  },
  {
    id: 'plan-008',
    title: 'Security Audit Checklist',
    content: `# Security Audit Checklist

## Authentication

### Password Security
- [x] Minimum password length (8 chars)
- [x] Password hashing (bcrypt via Supabase)
- [ ] Breached password check
- [ ] Rate limiting on login attempts
- [x] Secure session management

### OAuth
- [ ] State parameter for CSRF protection
- [ ] Validate redirect URIs
- [ ] Secure token storage

### Session Management
- [x] HttpOnly cookies for tokens
- [x] Secure flag on cookies
- [x] Session expiration (1 hour access, 60 days refresh)
- [ ] Session invalidation on password change

## Authorization

### Row Level Security
- [x] RLS enabled on all tables
- [x] Policies for SELECT/INSERT/UPDATE/DELETE
- [x] User can only access own data
- [ ] Admin role properly restricted

### API Authorization
- [x] Auth check on all protected routes
- [x] Validate user owns resource before mutation
- [ ] Rate limiting per user

## Data Protection

### Encryption
- [x] TLS for all connections
- [x] Database encryption at rest (Supabase)
- [ ] Encrypt sensitive fields in application

### Data Handling
- [x] No sensitive data in logs
- [x] No PII in error messages
- [ ] Data retention policy
- [ ] GDPR compliance (data export/deletion)

## Input Validation

### SQL Injection
- [x] Parameterized queries (Supabase client)
- [x] No raw SQL with user input
- [ ] Review any custom SQL functions

### XSS
- [x] React auto-escapes by default
- [ ] Review any dangerouslySetInnerHTML
- [ ] Content Security Policy header

### CSRF
- [x] SameSite cookies
- [x] PKCE for OAuth (no CSRF tokens needed)
- [ ] Verify Origin header on mutations

## Infrastructure

### Dependencies
- [ ] Run npm audit
- [ ] Update vulnerable packages
- [ ] Lock dependency versions

### Secrets
- [x] Secrets in environment variables
- [x] Different secrets per environment
- [ ] Rotate secrets periodically
- [ ] No secrets in git history

### Logging & Monitoring
- [ ] Log authentication events
- [ ] Log authorization failures
- [ ] Alert on suspicious activity
- [ ] Incident response plan

## Next Steps
1. Fix all unchecked items
2. Penetration testing (manual)
3. Bug bounty program (future)`,
    sourceType: 'planning',
    expectedNotes: [
      {
        titlePatterns: ['security audit', 'security checklist', 'security review'],
        contentMustContain: ['security', 'authentication', 'authorization', 'encryption'],
        purposePattern: /I am keeping this because.*(security|audit|protection)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#task/review', '#skill/security'],
        forbiddenTags: ['#security', '#audit'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Web Security]]', '[[OWASP Guidelines]]'],
        isSynthesis: true,
        synthesisIndicators: ['checklist', 'categories', 'next steps'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      contentType: 'checklist',
      themes: ['security', 'audit', 'compliance'],
    },
  },
  {
    id: 'plan-009',
    title: 'Content Strategy for Launch',
    content: `# Content Strategy for Launch

## Goals
1. Build awareness before launch
2. Educate potential users on value prop
3. Establish credibility in knowledge management space
4. Drive sign-ups when we launch

## Target Audience

### Primary
- Personal knowledge workers
- Daily journalers
- People who've tried Notion/Roam/Obsidian
- Interested in "second brain" concept

### Secondary
- Writers and bloggers
- Researchers
- People overwhelmed by their notes

## Content Pillars

### 1. Building in Public
Share the development journey:
- Weekly progress updates
- Technical challenges and solutions
- Design decisions and rationale
- Honest reflections on struggles

Channels: Twitter, personal blog

### 2. Knowledge Management Philosophy
Educational content on why this matters:
- "Why you forget what you journal"
- "The difference between storing and knowing"
- "How atomic notes change everything"

Channels: Blog posts, Twitter threads

### 3. Product Glimpses
Show the product without full reveal:
- Demo GIFs of key features
- Before/after comparisons
- User testimonials (early testers)

Channels: Twitter, landing page

## Content Calendar

### Pre-Launch (4 weeks out)

Week -4: "I've been building something"
- Announce the project exists
- Share the personal motivation
- Ask for early feedback

Week -3: "The knowledge problem I'm solving"
- Educational post on journaling + knowledge
- Link to existing research
- Position the problem

Week -2: "First look at the editor"
- Demo GIF of dream editor
- Explain the fading concept
- Gather reactions

Week -1: "How the knowledge graph works"
- Visual explanation
- Contrast with existing tools
- Build anticipation

### Launch Week

Day 1: "It's live"
- Product Hunt launch (if ready)
- Landing page goes live
- Sign-up opens

Day 2-3: Twitter storm
- Feature highlights
- User reactions
- Technical details for developers

Day 4-5: Follow-up content
- FAQ post
- Getting started guide
- First user stories

## Metrics
- Twitter followers: 500 by launch
- Email list: 200 sign-ups
- Launch day sign-ups: 50
- Week 1 active users: 20`,
    sourceType: 'planning',
    expectedNotes: [
      {
        titlePatterns: ['content strategy', 'launch marketing', 'content calendar'],
        contentMustContain: ['content', 'launch', 'audience', 'calendar'],
        purposePattern: /I am keeping this because.*(content|launch|marketing)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Logic' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#task/plan', '#decision/marketing'],
        forbiddenTags: ['#content', '#marketing'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Content Marketing]]', '[[Product Launch]]'],
        isSynthesis: true,
        synthesisIndicators: ['goals', 'pillars', 'calendar', 'metrics'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      contentType: 'strategy-doc',
      themes: ['marketing', 'content', 'launch'],
    },
  },
  {
    id: 'plan-010',
    title: 'API Versioning Strategy',
    content: `# API Versioning Strategy

## Why Version?
- Allow breaking changes without breaking existing clients
- Give users time to migrate
- Support multiple versions simultaneously during transition

## Versioning Approach

### URL Path Versioning
\`/api/v1/notes\` → \`/api/v2/notes\`

Pros:
- Explicit and visible
- Easy to route
- Clear in documentation

Cons:
- URL pollution
- Need to update all clients on major bump

### Decision: URL Path for Major Versions

We'll use URL path versioning for major versions:
- v1: Current API
- v2: Future breaking changes

Minor changes (additions, non-breaking) don't bump version.

## Deprecation Policy

### Timeline
1. Announce deprecation: 3 months before removal
2. Add deprecation warning header: immediately
3. Remove from docs: 1 month before
4. Remove endpoint: on announced date

### Communication
- In-app notice for affected users
- Email to API users (when we have external API)
- Deprecation header in responses:
  \`Deprecation: true\`
  \`Sunset: Sat, 1 Apr 2024 00:00:00 GMT\`

## Breaking vs Non-Breaking

### Non-Breaking (no version bump)
- Adding new endpoints
- Adding optional fields to responses
- Adding optional parameters to requests
- Deprecating (but not removing) fields

### Breaking (requires version bump)
- Removing endpoints
- Removing fields from responses
- Changing field types
- Changing required parameters
- Changing error formats

## Current API Inventory

### v1 Endpoints (current)
- POST /api/v1/ai/extract
- POST /api/v1/ai/coach
- GET /api/v1/ai/prompt
- GET /api/v1/graph/nodes
- GET /api/v1/graph/edges

### Migration Path: v1 → v2

When v2 is needed:
1. Create v2 routes alongside v1
2. Point new clients to v2
3. Add deprecation warnings to v1
4. After sunset, remove v1

## Tooling
- OpenAPI spec for each version
- Generated TypeScript types
- Version comparison docs`,
    sourceType: 'planning',
    expectedNotes: [
      {
        titlePatterns: ['API versioning', 'versioning strategy', 'API evolution'],
        contentMustContain: ['versioning', 'API', 'breaking', 'deprecation'],
        purposePattern: /I am keeping this because.*(versioning|API|deprecation)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/plan', '#decision/technical'],
        forbiddenTags: ['#api', '#versioning'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[API Design]]', '[[Semantic Versioning]]'],
        isSynthesis: true,
        synthesisIndicators: ['why version', 'decision', 'deprecation policy'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      contentType: 'strategy-doc',
      themes: ['api', 'versioning', 'planning'],
    },
  },
  {
    id: 'plan-011',
    title: 'Accessibility Improvement Plan',
    content: `# Accessibility Improvement Plan

## Current State
- No formal accessibility audit
- Keyboard navigation partially works
- Screen reader support unknown
- Color contrast not verified

## Target: WCAG 2.1 AA Compliance

## Audit Findings (Self-Assessment)

### Perceivable

**Images**
- [ ] All images have alt text
- [x] Decorative images have empty alt
- [ ] Complex images have long descriptions

**Color**
- [ ] 4.5:1 contrast for normal text
- [ ] 3:1 contrast for large text
- [ ] Information not conveyed by color alone
- [ ] Dark mode meets contrast requirements

**Text**
- [x] Text can be resized to 200%
- [ ] No horizontal scrolling at 320px width
- [ ] Line height at least 1.5

### Operable

**Keyboard**
- [ ] All interactive elements focusable
- [x] Visible focus indicator
- [ ] No keyboard traps
- [ ] Skip to main content link
- [ ] Logical tab order

**Timing**
- [ ] Pause/stop for auto-updating content
- [x] No time limits on forms
- [ ] Animations can be disabled

### Understandable

**Language**
- [x] Page language declared
- [ ] Abbreviations expanded

**Predictable**
- [x] Consistent navigation
- [ ] Consistent identification of components

**Input Assistance**
- [ ] Labels for all form inputs
- [ ] Error messages are descriptive
- [ ] Error prevention on important actions

### Robust

**Parsing**
- [x] Valid HTML
- [ ] ARIA used correctly
- [ ] Status messages announced

## Priority Fixes

### P0 - Critical
1. Add labels to all form inputs
2. Fix keyboard navigation in modals
3. Ensure sufficient color contrast

### P1 - Important
4. Add skip link
5. Implement ARIA live regions for updates
6. Test with screen reader

### P2 - Enhancement
7. Add reduced motion support
8. Improve error messages
9. Add long descriptions for complex visuals

## Testing Plan

### Automated
- Lighthouse accessibility audit
- axe-core in tests
- CI checks for new violations

### Manual
- Keyboard-only navigation test
- Screen reader testing (VoiceOver, NVDA)
- Color blindness simulation

### User Testing
- Include users with disabilities in research
- Feedback channel for a11y issues`,
    sourceType: 'planning',
    expectedNotes: [
      {
        titlePatterns: ['accessibility', 'a11y improvement', 'WCAG compliance'],
        contentMustContain: ['accessibility', 'WCAG', 'keyboard', 'screen reader'],
        purposePattern: /I am keeping this because.*(accessibility|a11y|inclusive)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#task/plan', '#UI/accessibility'],
        forbiddenTags: ['#accessibility', '#a11y'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[WCAG Guidelines]]', '[[Inclusive Design]]'],
        isSynthesis: true,
        synthesisIndicators: ['audit findings', 'priority fixes', 'testing plan'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      contentType: 'improvement-plan',
      themes: ['accessibility', 'inclusive-design', 'compliance'],
    },
  },
  {
    id: 'plan-012',
    title: 'Database Migration Strategy',
    content: `# Database Migration Strategy

## Principles
1. Migrations are forward-only
2. Every migration has a rollback plan
3. Zero downtime for production
4. Test migrations on staging first

## Migration Process

### 1. Write Migration
\`\`\`bash
supabase migration new add_note_tags
\`\`\`

Creates: \`supabase/migrations/[timestamp]_add_note_tags.sql\`

### 2. Write Rollback
\`\`\`bash
supabase migration new rollback_add_note_tags
\`\`\`

Even if we never use it, having a plan helps.

### 3. Test Locally
\`\`\`bash
supabase db reset  # Recreates from migrations
supabase db diff   # Shows changes vs production
\`\`\`

### 4. Test on Staging
\`\`\`bash
supabase link --project-ref staging-project
supabase db push
\`\`\`

Verify:
- Migration completes without errors
- Application works with new schema
- Performance is acceptable

### 5. Deploy to Production
\`\`\`bash
supabase link --project-ref prod-project
supabase db push
\`\`\`

## Zero-Downtime Patterns

### Adding a Column
1. Add column as nullable
2. Deploy code that handles null
3. Backfill existing rows
4. Add NOT NULL constraint (if needed)
5. Deploy code that requires the column

### Removing a Column
1. Deploy code that doesn't read the column
2. Deploy code that doesn't write the column
3. Remove the column

### Renaming a Column
1. Add new column
2. Copy data: UPDATE table SET new = old
3. Deploy code using new column
4. Remove old column

### Changing Column Type
1. Add new column with new type
2. Dual-write to both columns
3. Migrate existing data
4. Switch reads to new column
5. Remove old column

## Current Migrations

| Timestamp | Description | Status |
|-----------|-------------|--------|
| 001 | Initial schema | Deployed |
| 002 | Add coaching tables | Deployed |
| 003 | Add atomic notes | Deployed |
| 004 | Add note connections | Deployed |
| 005 | Add note history | Pending |

## Backup Strategy

### Before Migration
\`\`\`bash
pg_dump $DATABASE_URL > pre_migration_backup.sql
\`\`\`

### Daily Backups
- Supabase handles daily automated backups
- Point-in-time recovery available (Pro plan)

### Disaster Recovery
1. Restore from backup
2. Re-run migrations from last known good
3. Accept data loss since last backup (worst case)`,
    sourceType: 'planning',
    expectedNotes: [
      {
        titlePatterns: ['database migration', 'migration strategy', 'schema changes'],
        contentMustContain: ['migration', 'database', 'rollback', 'zero-downtime'],
        purposePattern: /I am keeping this because.*(migration|database|schema)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/plan', '#skill/databases'],
        forbiddenTags: ['#migration', '#database'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Database Migrations]]', '[[Zero-Downtime Deploys]]'],
        isSynthesis: true,
        synthesisIndicators: ['principles', 'zero-downtime patterns', 'backup strategy'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      contentType: 'strategy-doc',
      themes: ['database', 'devops', 'migrations'],
    },
  },
  {
    id: 'plan-013',
    title: 'Feature Prioritization Framework',
    content: `# Feature Prioritization Framework

## The Problem
Too many ideas, limited time. Need a consistent way to decide what to build next.

## Framework: ICE Score

### I - Impact (1-10)
How much will this improve the user experience?
- 10: Transforms the product
- 7-9: Significantly improves core flows
- 4-6: Nice improvement, not essential
- 1-3: Minor polish

### C - Confidence (1-10)
How confident are we that this will achieve the expected impact?
- 10: Validated with user research
- 7-9: Strong intuition + some data
- 4-6: Reasonable assumption
- 1-3: Pure speculation

### E - Effort (1-10, inverted)
How much effort to implement? (Lower effort = higher score)
- 10: < 1 day
- 7-9: 1-3 days
- 4-6: 1-2 weeks
- 1-3: > 2 weeks

### ICE Score = (I + C + E) / 3

## Current Feature Backlog (Scored)

| Feature | Impact | Confidence | Effort | ICE |
|---------|--------|------------|--------|-----|
| Fix mobile keyboard | 8 | 10 | 8 | 8.7 |
| Add onboarding | 7 | 8 | 7 | 7.3 |
| Improve extraction | 9 | 5 | 3 | 5.7 |
| Dark mode polish | 5 | 9 | 8 | 7.3 |
| Collaborative editing | 9 | 4 | 2 | 5.0 |
| Export to PDF | 4 | 8 | 6 | 6.0 |

## Decision Rules

1. **Do first**: ICE > 7, or P0 bugs
2. **Backlog**: ICE 5-7, scheduled for later
3. **Icebox**: ICE < 5, revisit quarterly
4. **Kill**: ICE < 3 after review

## Exceptions

### Override for Strategic Alignment
Some features have low ICE but high strategic value:
- Enables future features (platform building)
- Competitive necessity
- Revenue-critical

These can override ICE if justified in writing.

### Override for User Feedback
If multiple users independently request something:
- Bump confidence +2
- Re-score and prioritize

## Review Cadence

Weekly: Quick review of top 5 items
Monthly: Full backlog scoring
Quarterly: Icebox review + strategy alignment

## Anti-Patterns to Avoid

1. **Shiny Object Syndrome**: New ideas always feel more exciting
2. **Sunk Cost**: Don't finish low-value things just because you started
3. **Analysis Paralysis**: Perfect scoring isn't the goal; good-enough decisions are
4. **Ignoring Effort**: High impact doesn't justify infinite effort`,
    sourceType: 'planning',
    expectedNotes: [
      {
        titlePatterns: ['feature prioritization', 'ICE framework', 'backlog management'],
        contentMustContain: ['prioritization', 'impact', 'confidence', 'effort'],
        purposePattern: /I am keeping this because.*(prioritization|decision|backlog)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Logic' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/plan', '#decision/product'],
        forbiddenTags: ['#prioritization', '#backlog'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[ICE Framework]]', '[[Product Management]]'],
        isSynthesis: true,
        synthesisIndicators: ['framework', 'decision rules', 'anti-patterns'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      contentType: 'framework',
      themes: ['prioritization', 'product', 'decision-making'],
    },
  },
  {
    id: 'plan-014',
    title: 'Technical Debt Tracking',
    content: `# Technical Debt Inventory

## What is Tech Debt?
Shortcuts taken to ship faster that will slow us down later if not addressed.

## Debt Categories

### 🔴 Critical (Blocking)
Must fix before next major feature.

### 🟡 Important (Slowing)
Slowing development but not blocking.

### 🟢 Minor (Annoying)
Would be nice to fix but low priority.

## Current Inventory

### 🔴 Critical

**TD-001: No test coverage for extraction**
- Risk: Regressions go unnoticed
- Effort: 3 days
- Blocked: Major extraction changes

**TD-002: Coaching state machine is fragile**
- Risk: Hard to extend, easy to break
- Effort: 1 week
- Blocked: Adding new coaching features

### 🟡 Important

**TD-003: Duplicate code in hooks**
- Risk: Bugs fixed in one place, not others
- Effort: 1 day
- Impact: Slower feature development

**TD-004: No TypeScript strict mode**
- Risk: Type errors at runtime
- Effort: 2 days
- Impact: Bugs that types could catch

**TD-005: Console.log statements in production**
- Risk: Performance, security
- Effort: 2 hours
- Impact: Unprofessional, leaky

### 🟢 Minor

**TD-006: Inconsistent naming conventions**
- Risk: Confusion
- Effort: 4 hours
- Impact: Mild annoyance

**TD-007: Unused dependencies**
- Risk: Bundle size
- Effort: 1 hour
- Impact: Slightly larger downloads

**TD-008: Missing JSDoc comments**
- Risk: Onboarding difficulty
- Effort: Ongoing
- Impact: Slower contributor ramp-up

## Paydown Strategy

### Rule: 20% time on debt
Every sprint, allocate 20% of capacity to debt reduction.

### Prioritization
1. Critical debt blocks features
2. Important debt slows velocity
3. Minor debt when convenient

### Tracking
- Add TD-XXX to code comments
- Update this doc when debt changes
- Review quarterly

## Debt Prevention

### Before Taking On Debt
1. Is this really needed for MVP?
2. What's the cost of not doing it right?
3. When will we pay it down?

### Definition of Done
- No critical debt introduced
- Any new debt documented here
- Tests for new code`,
    sourceType: 'planning',
    expectedNotes: [
      {
        titlePatterns: ['technical debt', 'debt tracking', 'code quality'],
        contentMustContain: ['debt', 'technical', 'tracking', 'paydown'],
        purposePattern: /I am keeping this because.*(debt|quality|tracking)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/track', '#insight/core'],
        forbiddenTags: ['#tech-debt', '#code'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Technical Debt]]', '[[Code Quality]]'],
        isSynthesis: true,
        synthesisIndicators: ['inventory', 'paydown strategy', 'prevention'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      contentType: 'tracking-doc',
      themes: ['tech-debt', 'quality', 'maintenance'],
    },
  },
  {
    id: 'plan-015',
    title: 'Incident Response Plan',
    content: `# Incident Response Plan

## Severity Levels

### SEV-1: Critical
- Service completely down
- Data loss occurring
- Security breach
- Response: Immediate, all hands

### SEV-2: Major
- Core feature broken
- Performance severely degraded
- Affecting >50% of users
- Response: Within 1 hour

### SEV-3: Minor
- Non-core feature broken
- Performance degraded for some users
- Workaround available
- Response: Within 4 hours

## Response Process

### 1. Detect
- Monitoring alerts
- User reports
- Error rate spike
- Own testing

### 2. Assess
- What's the impact?
- How many users affected?
- Is there a workaround?
- Assign severity level

### 3. Communicate
- Update status page (if we have one)
- Notify affected users (for SEV-1/2)
- Internal update in Slack

### 4. Investigate
- Check recent deployments
- Review logs and errors
- Identify root cause
- Document findings

### 5. Mitigate
- Rollback if deployment caused it
- Implement workaround
- Communicate timeline

### 6. Resolve
- Deploy fix
- Verify fix in production
- Update communications

### 7. Post-Mortem
- What happened?
- Why did it happen?
- What will prevent recurrence?
- Action items with owners

## Runbooks

### Site Down
1. Check Vercel status
2. Check Supabase status
3. Check recent deployments
4. Rollback if recent deploy
5. Check DNS

### Database Issues
1. Check Supabase dashboard
2. Look for long-running queries
3. Check connection pool
4. Contact Supabase support

### Auth Issues
1. Check Supabase Auth logs
2. Verify environment variables
3. Test login flow manually
4. Check token expiration

### AI/Claude Issues
1. Check Anthropic status
2. Review API error responses
3. Check rate limits
4. Fall back to cached responses

## Tools

### Monitoring
- Vercel Analytics
- Supabase Dashboard
- (Future: Sentry, Datadog)

### Communication
- Status page: (TBD)
- User email for major incidents
- Twitter for public acknowledgment

## On-Call

Currently: Just me. No rotation.

Future: If we have a team:
- Weekly rotation
- Primary + secondary
- Clear escalation path`,
    sourceType: 'planning',
    expectedNotes: [
      {
        titlePatterns: ['incident response', 'runbooks', 'on-call'],
        contentMustContain: ['incident', 'severity', 'response', 'runbook'],
        purposePattern: /I am keeping this because.*(incident|response|operations)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/plan', '#skill/devops'],
        forbiddenTags: ['#incidents', '#devops'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Incident Management]]', '[[Site Reliability]]'],
        isSynthesis: true,
        synthesisIndicators: ['severity levels', 'process', 'runbooks'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      contentType: 'playbook',
      themes: ['operations', 'reliability', 'incident-response'],
    },
  },
]

// =============================================================================
// EDGE CASES (1-10)
// =============================================================================

export const EDGE_CASES: ContentFixture[] = [
  {
    id: 'edge-001',
    title: 'Empty Document',
    content: ``,
    sourceType: 'edge-case',
    expectedNotes: [],
    metadata: {
      projectContext: '',
      complexity: 'simple',
      contentType: 'empty',
      themes: ['edge-case'],
    },
  },
  {
    id: 'edge-002',
    title: 'Single Word',
    content: `Hello`,
    sourceType: 'edge-case',
    expectedNotes: [],
    metadata: {
      projectContext: '',
      complexity: 'simple',
      contentType: 'minimal',
      themes: ['edge-case'],
    },
  },
  {
    id: 'edge-003',
    title: 'Just Code No Context',
    content: `\`\`\`typescript
const sum = (a: number, b: number): number => a + b;

export function calculateTotal(items: Item[]): number {
  return items.reduce((acc, item) => sum(acc, item.price), 0);
}

interface Item {
  id: string;
  name: string;
  price: number;
}
\`\`\``,
    sourceType: 'edge-case',
    expectedNotes: [],
    metadata: {
      projectContext: '',
      complexity: 'simple',
      contentType: 'code-only',
      themes: ['edge-case', 'code'],
    },
  },
  {
    id: 'edge-004',
    title: 'Extremely Long Single Paragraph',
    content: `This is an extremely long paragraph that just keeps going and going without any breaks or structure. It contains thoughts about productivity and how we often try to optimize every moment of our day but that can be counterproductive because our brains need rest and we also need time for serendipity and unexpected discoveries that can only happen when we aren't trying to be productive. There's also the question of what productivity even means because if we're producing things that don't matter then are we really being productive or just busy? And busyness is often a status symbol in our culture but it might actually be a sign that we haven't figured out what's truly important. The most productive people I know often seem calm and unhurried because they've ruthlessly prioritized and said no to almost everything so they can say yes to the few things that really matter. This reminds me of the quote "if you have more than three priorities you don't have any" which I think about often when I'm making my to-do lists that sometimes have twenty items on them. How can twenty things all be priorities? They can't. Something has to give. But choosing what to give up is hard because everything feels important in the moment. Maybe that's the real skill - developing the judgment to know what matters before the urgency of the moment forces a decision. Urgency and importance are different things though they often get confused. Urgent things demand attention right now but important things are what actually move you toward your goals. Most of our days are spent on urgent unimportant things while important non-urgent things get perpetually postponed. Is there a way out of this trap? I think it requires ruthless calendar protection, saying no more often, and accepting that some urgent things will just not get done. That's uncomfortable but necessary. What's the alternative? A life spent reacting to other people's priorities? That doesn't sound like living, it sounds like existing. There has to be a better way. Maybe the better way starts with getting clear on values and then using those values as a filter for what gets attention. If something doesn't connect to a value, it doesn't get time. Simple in theory, hard in practice.`,
    sourceType: 'edge-case',
    expectedNotes: [
      {
        titlePatterns: ['productivity paradox', 'urgency vs importance', 'prioritization'],
        contentMustContain: ['productivity', 'priorities', 'important'],
        purposePattern: /I am keeping this because.*(productivity|priorities|values)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core'],
        forbiddenTags: ['#productivity'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Prioritization]]'],
        isSynthesis: true,
        synthesisIndicators: ['ruthlessly prioritized', 'judgment', 'values filter'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      contentType: 'stream-of-consciousness',
      themes: ['edge-case', 'productivity', 'long-form'],
    },
  },
  {
    id: 'edge-005',
    title: 'Multiple Languages Mixed',
    content: `# Development Notes

Heute habe ich an der Benutzeroberfläche gearbeitet. The main challenge was getting the フォーム validation to work properly.

## Problème rencontré
La conexión con la base de datos était intermittente. Ich musste die Timeout-Einstellungen anpassen.

## 解决方案
1. Increased connection timeout to 30s
2. Added retry logic mit exponentiellen Backoff
3. Implementé un système de cache

결론: The system is now stable. Merci à tous for the help.`,
    sourceType: 'edge-case',
    expectedNotes: [
      {
        titlePatterns: ['database connection', 'timeout', 'caching'],
        contentMustContain: ['connection', 'timeout', 'cache', 'retry'],
        purposePattern: /I am keeping this because.*(connection|database|stability)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/debug'],
        forbiddenTags: [],
        expectedUpwardLink: null,
        expectedSidewaysLinks: [],
        isSynthesis: false,
        synthesisIndicators: [],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      contentType: 'multilingual',
      themes: ['edge-case', 'language', 'technical'],
    },
  },
  {
    id: 'edge-006',
    title: 'Heavy Emoji Usage',
    content: `🎉 BIG WIN TODAY! 🎉

Finally fixed that bug 🐛 that's been haunting me for weeks! 👻

The solution? 🤔💭

1. 🔍 Investigated the logs
2. 🧪 Wrote a failing test
3. 💡 Had an aha moment in the shower
4. 💻 Implemented the fix
5. ✅ All tests passing!

Feeling: 😊 → 🤩 → 🥳

What I learned:
- 🧘 Patience pays off
- 📝 Always write tests first
- 🚿 Shower thinking is real
- 🤝 The rubber duck is your friend

Tomorrow's goal: 🚀 Deploy to production!

#blessed #developer #bugfixed 🙌`,
    sourceType: 'edge-case',
    expectedNotes: [
      {
        titlePatterns: ['debugging process', 'test-driven', 'shower thinking'],
        contentMustContain: ['bug', 'test', 'fix', 'learned'],
        purposePattern: /I am keeping this because.*(debugging|process|learning)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core'],
        forbiddenTags: [],
        expectedUpwardLink: null,
        expectedSidewaysLinks: [],
        isSynthesis: true,
        synthesisIndicators: ['patience', 'tests first', 'shower thinking'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'simple',
      contentType: 'emoji-heavy',
      themes: ['edge-case', 'informal'],
    },
  },
  {
    id: 'edge-007',
    title: 'Contradictory Information',
    content: `# My thoughts on React

React is the best framework for building UIs. Everyone should use it. The component model is intuitive and the ecosystem is unmatched.

Actually, no. React is overengineered. For most projects, vanilla JavaScript is better. The bundle size is huge and hooks are confusing.

Wait, let me reconsider. React + Next.js is actually great for production apps. The DX is good and Server Components solve the bundle size issue.

But then again, Svelte is simpler and faster. Maybe I should switch.

No, actually React is fine. I'm just overthinking this. The best framework is the one you know. React has the biggest job market anyway.

Or does that matter? I'm building for myself, not for jobs.

I don't know what I think anymore. Maybe I should just pick one and stop second-guessing.

Final answer: React. For now.`,
    sourceType: 'edge-case',
    expectedNotes: [
      {
        titlePatterns: ['framework indecision', 'analysis paralysis', 'React thoughts'],
        contentMustContain: ['React', 'framework', 'decision'],
        purposePattern: /I am keeping this because.*(decision|framework|choice)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#decision/technical'],
        forbiddenTags: [],
        expectedUpwardLink: null,
        expectedSidewaysLinks: [],
        isSynthesis: true,
        synthesisIndicators: ['best is one you know', 'stop second-guessing'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      contentType: 'contradictory',
      themes: ['edge-case', 'decision-making'],
    },
  },
  {
    id: 'edge-008',
    title: 'Highly Technical Dense Content',
    content: `## TCP/IP Packet Inspection Notes

Analyzing the TCP three-way handshake packet capture:

Frame 1: SYN
- Source: 192.168.1.100:54321
- Dest: 10.0.0.5:443
- Seq: 0x00000000
- Flags: 0x002 (SYN)
- Window: 65535
- Options: MSS=1460, SACK_PERM, TSval=1234567, WS=7

Frame 2: SYN-ACK
- Source: 10.0.0.5:443
- Dest: 192.168.1.100:54321
- Seq: 0x00000000, Ack: 0x00000001
- Flags: 0x012 (SYN, ACK)
- Window: 28960
- Options: MSS=1380, SACK_PERM, TSval=9876543, TSecr=1234567, WS=8

Frame 3: ACK
- Seq: 0x00000001, Ack: 0x00000001
- Flags: 0x010 (ACK)

Observations:
1. MSS negotiation: Client requested 1460, server responded 1380 (MTU limitation)
2. SACK enabled both directions - will help with packet loss recovery
3. Window scaling: Client WS=7 (128 scale), Server WS=8 (256 scale)
4. TCP timestamps present - enables RTTM and PAWS

Performance implications:
- Max window size: 28960 * 256 = 7.4MB (server limited)
- Estimated BDP: If RTT=50ms, theoretical max throughput = 150 Mbps
- Actual will be lower due to congestion control

TODO: Capture TLS handshake for certificate analysis`,
    sourceType: 'edge-case',
    expectedNotes: [
      {
        titlePatterns: ['TCP handshake', 'packet analysis', 'network performance'],
        contentMustContain: ['TCP', 'handshake', 'window', 'MSS'],
        purposePattern: /I am keeping this because.*(TCP|network|performance)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#skill/networking', '#task/analyze'],
        forbiddenTags: [],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[TCP Protocol]]', '[[Network Performance]]'],
        isSynthesis: true,
        synthesisIndicators: ['observations', 'performance implications'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'complex',
      contentType: 'highly-technical',
      themes: ['edge-case', 'networking', 'technical'],
    },
  },
  {
    id: 'edge-009',
    title: 'Repeated Content',
    content: `Note to self: Always backup your data.

Note to self: Always backup your data.

Note to self: Always backup your data.

I'm writing this three times because I keep forgetting and then losing work.

Note to self: Always backup your data.

Seriously. Just do it. You'll thank yourself later.

Note to self: Always backup your data.

This is important.

Note to self: Always backup your data.`,
    sourceType: 'edge-case',
    expectedNotes: [
      {
        titlePatterns: ['backup reminder', 'data safety'],
        contentMustContain: ['backup', 'data'],
        purposePattern: /I am keeping this because.*(backup|data|important)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/habit'],
        forbiddenTags: [],
        expectedUpwardLink: null,
        expectedSidewaysLinks: [],
        isSynthesis: false,
        synthesisIndicators: [],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'simple',
      contentType: 'repetitive',
      themes: ['edge-case', 'emphasis'],
    },
  },
  {
    id: 'edge-010',
    title: 'Mixed Content Types in One Document',
    content: `# Daily Log 2024-01-15

## Morning Standup Notes
- Discussed sprint priorities
- Sarah mentioned the API is ready
- Blocked on design feedback

## Random Thought
I wonder if coffee is actually helping or just feeding the addiction at this point. Every cup feels necessary but also insufficient. Maybe I should switch to tea?

## Bug Investigation

\`\`\`javascript
// This code throws on null user
const userName = user.profile.name;

// Should be:
const userName = user?.profile?.name ?? 'Anonymous';
\`\`\`

## Lunch Break Reflection
Had a good conversation with Mike about career growth. Key insight: "The best developers are the ones who make other developers better." I want to do more mentoring.

## Afternoon Meeting Notes
Project X timeline:
- Alpha: Feb 1
- Beta: Mar 15
- Launch: Apr 1

## Evening TODO
- [ ] Call mom
- [ ] Buy groceries
- [ ] Finish that book chapter
- [x] Fix the null bug (did this during meeting lol)

## Quote of the Day
"The only way to do great work is to love what you do." - Steve Jobs

Do I love what I do? Some days yes, some days it's just work. Is that okay?`,
    sourceType: 'edge-case',
    expectedNotes: [
      {
        titlePatterns: ['mentoring insight', 'developer growth'],
        contentMustContain: ['mentoring', 'better', 'developers'],
        purposePattern: /I am keeping this because.*(mentoring|growth|developers)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core'],
        forbiddenTags: [],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Career Growth]]', '[[Mentoring]]'],
        isSynthesis: true,
        synthesisIndicators: ['make other developers better', 'want to do more'],
      },
      {
        titlePatterns: ['null safety pattern', 'optional chaining'],
        contentMustContain: ['null', 'optional', 'chaining'],
        purposePattern: /I am keeping this because.*(null|safety|bug)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/debug'],
        forbiddenTags: [],
        expectedUpwardLink: null,
        expectedSidewaysLinks: [],
        isSynthesis: false,
        synthesisIndicators: [],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'complex',
      contentType: 'mixed',
      themes: ['edge-case', 'daily-log', 'mixed-content'],
    },
  },
]

// =============================================================================
// EXPORTS
// =============================================================================

export function getAllReflectiveEntries(): ContentFixture[] {
  return REFLECTIVE_ENTRIES
}

export function getAllPlanningDocuments(): ContentFixture[] {
  return PLANNING_DOCUMENTS
}

export function getAllEdgeCases(): ContentFixture[] {
  return EDGE_CASES
}

export function getFixturesBySourceType(sourceType: 'reflective' | 'planning' | 'edge-case'): ContentFixture[] {
  switch (sourceType) {
    case 'reflective':
      return REFLECTIVE_ENTRIES
    case 'planning':
      return PLANNING_DOCUMENTS
    case 'edge-case':
      return EDGE_CASES
    default:
      return []
  }
}

export function getFixtureById(id: string): ContentFixture | undefined {
  return [...REFLECTIVE_ENTRIES, ...PLANNING_DOCUMENTS, ...EDGE_CASES].find((f) => f.id === id)
}
