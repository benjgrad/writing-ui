/**
 * Coaching Transcript Test Fixtures
 *
 * 40 coaching conversations with goals, whyRoot, and expected note quality.
 * Based on the 6-stage coaching flow: welcome -> goal_discovery ->
 * why_drilling -> micro_win -> confirmation -> complete
 */

import type { QualityExpectation, NoteStatus, NoteType, Stakeholder } from '../../quality/types'

export interface CoachingTranscriptFixture {
  id: string
  goal: {
    title: string
    whyRoot: string
    microWin: string
  }
  transcript: string
  expectedNotes: QualityExpectation[]
  metadata: {
    projectContext: string
    complexity: 'simple' | 'moderate' | 'complex'
    themes: string[]
  }
}

export const COACHING_TRANSCRIPTS: CoachingTranscriptFixture[] = [
  // ==========================================================================
  // Writing UI Project - Accessibility Focus (1-10)
  // ==========================================================================
  {
    id: 'coaching-001',
    goal: {
      title: 'Build accessible journaling UI',
      whyRoot: 'Help people with motor disabilities express themselves through voice',
      microWin: 'Research Web Speech API browser support this weekend',
    },
    transcript: `assistant: Hi! I'm excited to help you work on a new goal. What would you like to focus on?

user: I want to make my journaling app more accessible for people who have trouble typing.

assistant: [GOAL_CAPTURED]
Build accessible journaling UI
That's a meaningful goal! Accessibility is so important. Tell me - why does making your app accessible matter to you personally?

user: My grandmother has arthritis and can't type anymore. She used to keep journals but had to stop. I want to help people like her.

assistant: [WHY_CAPTURED]
Help people with motor disabilities express themselves through voice
I really hear you - wanting to help your grandmother and people like her keep journaling is so personal and meaningful. What's one small step you could take this week toward this?

user: I could research which speech-to-text APIs work best in browsers.

assistant: [MICROWIN_CAPTURED]
Research Web Speech API browser support this weekend
That's a perfect first step! Understanding the technical landscape before diving in will save you so much time. Ready to make this your goal?

user: Yes, let's do it!

assistant: [GOAL_COMPLETE]
You've got such a meaningful goal with a clear personal connection. Good luck with your Web Speech API research this weekend!`,
    expectedNotes: [
      {
        titlePatterns: ['accessible', 'journaling', 'voice', 'speech-to-text', 'STT'],
        contentMustContain: ['accessibility', 'motor disabilities', 'voice input'],
        purposePattern: /I am keeping this because.*(accessibility|voice|grandmother|motor)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Logic' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#task/research', '#UI/accessibility'],
        forbiddenTags: ['#journaling', '#speech', '#accessibility'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Web Speech API]]', '[[Inclusive Design]]'],
        isSynthesis: true,
        synthesisIndicators: ['personal motivation', 'accessibility as a core value', 'grandmother'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      themes: ['accessibility', 'voice-input', 'personal-motivation'],
    },
  },
  {
    id: 'coaching-002',
    goal: {
      title: 'Implement auto-save with visual feedback',
      whyRoot: 'Reduce anxiety about losing work and build trust with users',
      microWin: 'Add a simple "Saved" indicator that appears after each auto-save',
    },
    transcript: `assistant: What goal would you like to work on today?

user: I need to add auto-save to my writing app. Users are worried about losing their work.

assistant: [GOAL_CAPTURED]
Implement auto-save with visual feedback
That's an important UX feature! Why does reducing this anxiety matter to you?

user: I've lost work before and it's devastating. I don't want my users to ever feel that panic.

assistant: [WHY_CAPTURED]
Reduce anxiety about losing work and build trust with users
That personal experience really drives home why this matters. What small step could you take this week?

user: I'll add a "Saved" indicator that shows up after auto-save completes.

assistant: [MICROWIN_CAPTURED]
Add a simple "Saved" indicator that appears after each auto-save
Perfect - visible feedback is key to building that trust. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Great goal! That visual feedback will make a real difference in user confidence.`,
    expectedNotes: [
      {
        titlePatterns: ['auto-save', 'visual feedback', 'save indicator'],
        contentMustContain: ['auto-save', 'feedback', 'trust', 'anxiety'],
        purposePattern: /I am keeping this because.*(trust|anxiety|losing work)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#task/implement', '#UI/feedback'],
        forbiddenTags: ['#auto-save', '#ux'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[User Trust Patterns]]'],
        isSynthesis: true,
        synthesisIndicators: ['personal experience', 'user anxiety', 'trust building'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'simple',
      themes: ['ux', 'trust', 'feedback'],
    },
  },
  {
    id: 'coaching-003',
    goal: {
      title: 'Create distraction-free writing mode',
      whyRoot: 'Help writers achieve flow state by removing visual clutter',
      microWin: 'Design a minimal interface with just the text and a subtle word count',
    },
    transcript: `assistant: What would you like to focus on?

user: I want to create a distraction-free writing mode for my app.

assistant: [GOAL_CAPTURED]
Create distraction-free writing mode
Love it! Why is helping writers focus important to you?

user: When I write, any distraction breaks my flow. I want to give others that deep focus experience.

assistant: [WHY_CAPTURED]
Help writers achieve flow state by removing visual clutter
Flow state is so valuable and fragile. What's one step you could take?

user: Design a minimal interface - just text and maybe a subtle word count.

assistant: [MICROWIN_CAPTURED]
Design a minimal interface with just the text and a subtle word count
That sounds beautifully focused. Ready to make this your goal?

user: Absolutely!

assistant: [GOAL_COMPLETE]
Wonderful! A clean, focused writing experience awaits.`,
    expectedNotes: [
      {
        titlePatterns: ['distraction-free', 'writing mode', 'focus', 'minimal'],
        contentMustContain: ['flow state', 'distraction', 'focus', 'minimal'],
        purposePattern: /I am keeping this because.*(flow|focus|distraction)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Logic' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#task/design', '#UI/flow'],
        forbiddenTags: ['#writing', '#focus'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Flow State]]', '[[Minimal Design]]'],
        isSynthesis: true,
        synthesisIndicators: ['personal experience', 'flow state', 'deep focus'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'simple',
      themes: ['focus', 'flow', 'minimalism'],
    },
  },
  {
    id: 'coaching-004',
    goal: {
      title: 'Build knowledge graph visualization',
      whyRoot: 'Make invisible connections between ideas visible to spark new insights',
      microWin: 'Prototype a simple force-directed graph with D3.js',
    },
    transcript: `assistant: What goal would you like to work on?

user: I want to visualize the connections between notes as a knowledge graph.

assistant: [GOAL_CAPTURED]
Build knowledge graph visualization
That's fascinating! Why does visualizing these connections matter to you?

user: I believe the most valuable insights come from connecting ideas that seem unrelated. A visual graph could reveal those hidden connections.

assistant: [WHY_CAPTURED]
Make invisible connections between ideas visible to spark new insights
What a powerful insight about insights! What's one step you could take?

user: I could prototype a simple force-directed graph using D3.js.

assistant: [MICROWIN_CAPTURED]
Prototype a simple force-directed graph with D3.js
D3 is perfect for this. Ready to commit to this goal?

user: Yes, I'm excited!

assistant: [GOAL_COMPLETE]
This is going to be beautiful! Enjoy bringing those hidden connections to light.`,
    expectedNotes: [
      {
        titlePatterns: ['knowledge graph', 'visualization', 'connections'],
        contentMustContain: ['connections', 'insights', 'graph', 'visual'],
        purposePattern: /I am keeping this because.*(connections|insights|ideas)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/implement', '#skill/d3'],
        forbiddenTags: ['#graph', '#visualization'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[D3.js]]', '[[Force-Directed Graphs]]'],
        isSynthesis: true,
        synthesisIndicators: ['belief about insights', 'hidden connections', 'unrelated ideas'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      themes: ['visualization', 'knowledge-management', 'insights'],
    },
  },
  {
    id: 'coaching-005',
    goal: {
      title: 'Implement document search with highlights',
      whyRoot: 'Help users rediscover forgotten ideas when they need them most',
      microWin: 'Add basic full-text search using Supabase text search',
    },
    transcript: `assistant: What would you like to focus on today?

user: I need to add search functionality so users can find their old notes.

assistant: [GOAL_CAPTURED]
Implement document search with highlights
Essential feature! Why does helping users find old content matter to you?

user: I have years of notes I never look at because I can't find them. I want to help people rediscover their forgotten ideas.

assistant: [WHY_CAPTURED]
Help users rediscover forgotten ideas when they need them most
Those forgotten ideas are treasure! What's one step you could take?

user: Start with basic full-text search using Supabase's built-in search.

assistant: [MICROWIN_CAPTURED]
Add basic full-text search using Supabase text search
Good foundation choice. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Great! You're about to help users unearth their buried treasure.`,
    expectedNotes: [
      {
        titlePatterns: ['search', 'full-text', 'document search'],
        contentMustContain: ['search', 'find', 'rediscover', 'forgotten'],
        purposePattern: /I am keeping this because.*(rediscover|forgotten|find)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#task/implement', '#skill/supabase'],
        forbiddenTags: ['#search', '#database'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Supabase]]', '[[Full-Text Search]]'],
        isSynthesis: true,
        synthesisIndicators: ['personal experience', 'years of notes', 'treasure'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      themes: ['search', 'discovery', 'knowledge-retrieval'],
    },
  },
  {
    id: 'coaching-006',
    goal: {
      title: 'Add keyboard shortcuts for power users',
      whyRoot: 'Respect users time by making common actions instant',
      microWin: 'Implement Cmd+S for save and Cmd+K for command palette',
    },
    transcript: `assistant: What goal would you like to work on?

user: I want to add keyboard shortcuts to my writing app.

assistant: [GOAL_CAPTURED]
Add keyboard shortcuts for power users
Excellent for power users! Why do shortcuts matter to you?

user: Every second counts when you're in flow. Mouse movements break concentration. I want to respect users' time.

assistant: [WHY_CAPTURED]
Respect users time by making common actions instant
Time and flow are precious. What's one step you could take?

user: Implement the basics: Cmd+S for save and Cmd+K for a command palette.

assistant: [MICROWIN_CAPTURED]
Implement Cmd+S for save and Cmd+K for command palette
Those two will cover so much! Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Your power users will love you for this!`,
    expectedNotes: [
      {
        titlePatterns: ['keyboard shortcuts', 'hotkeys', 'power users'],
        contentMustContain: ['keyboard', 'shortcuts', 'flow', 'time'],
        purposePattern: /I am keeping this because.*(time|flow|instant)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#task/implement', '#UI/keyboard'],
        forbiddenTags: ['#shortcuts', '#keyboard'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Command Palette Pattern]]'],
        isSynthesis: true,
        synthesisIndicators: ['flow', 'concentration', 'respect time'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'simple',
      themes: ['productivity', 'power-users', 'efficiency'],
    },
  },
  {
    id: 'coaching-007',
    goal: {
      title: 'Create mobile-responsive writing experience',
      whyRoot: 'Capture ideas wherever inspiration strikes',
      microWin: 'Test and fix the editor layout on iPhone 14',
    },
    transcript: `assistant: What would you like to focus on?

user: My writing app doesn't work well on mobile. I need to fix that.

assistant: [GOAL_CAPTURED]
Create mobile-responsive writing experience
Mobile is crucial! Why does mobile writing matter to you?

user: Ideas don't wait for you to get to your desk. I want to capture inspiration wherever it strikes.

assistant: [WHY_CAPTURED]
Capture ideas wherever inspiration strikes
Inspiration is fleeting! What's one step you could take?

user: Test the editor on my iPhone and fix the layout issues I find.

assistant: [MICROWIN_CAPTURED]
Test and fix the editor layout on iPhone 14
Hands-on testing is perfect. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Great! Soon you'll be capturing ideas from anywhere.`,
    expectedNotes: [
      {
        titlePatterns: ['mobile', 'responsive', 'mobile writing'],
        contentMustContain: ['mobile', 'responsive', 'inspiration', 'capture'],
        purposePattern: /I am keeping this because.*(mobile|inspiration|anywhere)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/fix', '#UI/responsive'],
        forbiddenTags: ['#mobile', '#responsive'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Mobile-First Design]]'],
        isSynthesis: true,
        synthesisIndicators: ['inspiration strikes', 'fleeting ideas'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      themes: ['mobile', 'responsive', 'ubiquitous-capture'],
    },
  },
  {
    id: 'coaching-008',
    goal: {
      title: 'Implement dark mode theme',
      whyRoot: 'Reduce eye strain for late-night writers',
      microWin: 'Create a CSS custom property system for theming',
    },
    transcript: `assistant: What goal would you like to work on?

user: I want to add dark mode to my writing app.

assistant: [GOAL_CAPTURED]
Implement dark mode theme
Dark mode is popular! Why does this matter to you?

user: I write at night a lot. Bright screens hurt my eyes. I want to protect other night writers too.

assistant: [WHY_CAPTURED]
Reduce eye strain for late-night writers
Fellow night owl! What's one step you could take?

user: Set up a CSS custom property system so I can easily switch themes.

assistant: [MICROWIN_CAPTURED]
Create a CSS custom property system for theming
Smart foundation choice. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Perfect! Your eyes (and others') will thank you.`,
    expectedNotes: [
      {
        titlePatterns: ['dark mode', 'theme', 'theming'],
        contentMustContain: ['dark mode', 'eye strain', 'theme', 'night'],
        purposePattern: /I am keeping this because.*(eye strain|night|dark)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/implement', '#UI/theming'],
        forbiddenTags: ['#dark-mode', '#theme'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[CSS Custom Properties]]'],
        isSynthesis: true,
        synthesisIndicators: ['personal experience', 'night writing', 'eye protection'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'simple',
      themes: ['theming', 'accessibility', 'personal-preference'],
    },
  },
  {
    id: 'coaching-009',
    goal: {
      title: 'Build word count and reading time display',
      whyRoot: 'Help writers understand the scope of their work at a glance',
      microWin: 'Add a live word counter in the footer',
    },
    transcript: `assistant: What would you like to focus on?

user: I want to show word count and estimated reading time.

assistant: [GOAL_CAPTURED]
Build word count and reading time display
Useful metrics! Why do these numbers matter to you?

user: I often write too much or too little. Knowing the word count helps me calibrate to the right length.

assistant: [WHY_CAPTURED]
Help writers understand the scope of their work at a glance
Calibration is key! What's one step you could take?

user: Add a simple live word counter to the footer.

assistant: [MICROWIN_CAPTURED]
Add a live word counter in the footer
Simple and effective. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Great! You'll have instant scope awareness.`,
    expectedNotes: [
      {
        titlePatterns: ['word count', 'reading time', 'metrics'],
        contentMustContain: ['word count', 'reading time', 'scope', 'length'],
        purposePattern: /I am keeping this because.*(scope|length|calibrate)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/implement', '#UI/metrics'],
        forbiddenTags: ['#word-count', '#metrics'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Writing Metrics]]'],
        isSynthesis: true,
        synthesisIndicators: ['write too much', 'calibrate', 'right length'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'simple',
      themes: ['metrics', 'writing-tools', 'self-awareness'],
    },
  },
  {
    id: 'coaching-010',
    goal: {
      title: 'Add export to Markdown and PDF',
      whyRoot: 'Give users ownership of their content in portable formats',
      microWin: 'Implement Markdown export with frontmatter metadata',
    },
    transcript: `assistant: What goal would you like to work on?

user: I want to let users export their writing to Markdown and PDF.

assistant: [GOAL_CAPTURED]
Add export to Markdown and PDF
Data portability! Why is this important to you?

user: I've been locked into apps before. I believe users should own their content and be able to take it anywhere.

assistant: [WHY_CAPTURED]
Give users ownership of their content in portable formats
User ownership is crucial! What's one step you could take?

user: Start with Markdown export, including metadata as frontmatter.

assistant: [MICROWIN_CAPTURED]
Implement Markdown export with frontmatter metadata
Markdown first is smart. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Wonderful! You're giving users true ownership.`,
    expectedNotes: [
      {
        titlePatterns: ['export', 'Markdown', 'PDF', 'portability'],
        contentMustContain: ['export', 'Markdown', 'ownership', 'portable'],
        purposePattern: /I am keeping this because.*(ownership|portable|locked)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Logic' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#task/implement', '#decision/technical'],
        forbiddenTags: ['#export', '#markdown'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Data Portability]]', '[[Markdown Frontmatter]]'],
        isSynthesis: true,
        synthesisIndicators: ['locked into apps', 'user ownership', 'believe'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      themes: ['data-portability', 'user-ownership', 'export'],
    },
  },

  // ==========================================================================
  // Knowledge Management Focus (11-20)
  // ==========================================================================
  {
    id: 'coaching-011',
    goal: {
      title: 'Implement atomic note extraction from documents',
      whyRoot: 'Transform stream-of-consciousness writing into reusable knowledge units',
      microWin: 'Create a prompt that extracts 3-5 atomic ideas from a document',
    },
    transcript: `assistant: What would you like to focus on?

user: I want to automatically extract atomic notes from longer documents.

assistant: [GOAL_CAPTURED]
Implement atomic note extraction from documents
Zettelkasten style! Why does this matter to you?

user: I write long journal entries but never revisit them. Breaking them into atomic pieces would make them reusable.

assistant: [WHY_CAPTURED]
Transform stream-of-consciousness writing into reusable knowledge units
Reusability is the key! What's one step you could take?

user: Design a prompt that can identify and extract 3-5 atomic ideas from a document.

assistant: [MICROWIN_CAPTURED]
Create a prompt that extracts 3-5 atomic ideas from a document
Prompt engineering is the foundation. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Exciting! You're building a knowledge factory.`,
    expectedNotes: [
      {
        titlePatterns: ['atomic notes', 'extraction', 'Zettelkasten'],
        contentMustContain: ['atomic', 'extraction', 'reusable', 'knowledge'],
        purposePattern: /I am keeping this because.*(reusable|atomic|knowledge)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/implement', '#skill/prompt-engineering'],
        forbiddenTags: ['#notes', '#extraction'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Zettelkasten Method]]', '[[Atomic Notes]]'],
        isSynthesis: true,
        synthesisIndicators: ['never revisit', 'reusable', 'breaking into pieces'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      themes: ['knowledge-management', 'zettelkasten', 'ai-extraction'],
    },
  },
  {
    id: 'coaching-012',
    goal: {
      title: 'Build note deduplication system',
      whyRoot: 'Prevent knowledge fragmentation by consolidating similar ideas',
      microWin: 'Research semantic similarity APIs for finding duplicate content',
    },
    transcript: `assistant: What goal would you like to work on?

user: I keep writing the same ideas in different documents. I need to detect and merge duplicates.

assistant: [GOAL_CAPTURED]
Build note deduplication system
Knowledge consolidation! Why does this matter?

user: Having the same idea in 5 different places fragments my knowledge. One rich note is better than five thin ones.

assistant: [WHY_CAPTURED]
Prevent knowledge fragmentation by consolidating similar ideas
One rich source of truth! What's one step you could take?

user: Research semantic similarity APIs that can find duplicate or near-duplicate content.

assistant: [MICROWIN_CAPTURED]
Research semantic similarity APIs for finding duplicate content
Good research focus. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Great! You're fighting knowledge entropy.`,
    expectedNotes: [
      {
        titlePatterns: ['deduplication', 'consolidation', 'duplicate detection'],
        contentMustContain: ['duplicate', 'consolidate', 'semantic', 'similarity'],
        purposePattern: /I am keeping this because.*(fragmentation|consolidate|duplicate)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/research', '#decision/technical'],
        forbiddenTags: ['#deduplication', '#duplicate'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Semantic Similarity]]', '[[Knowledge Consolidation]]'],
        isSynthesis: true,
        synthesisIndicators: ['same idea in 5 places', 'fragments knowledge', 'rich vs thin'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      themes: ['deduplication', 'knowledge-consolidation', 'semantic-search'],
    },
  },
  {
    id: 'coaching-013',
    goal: {
      title: 'Create tag suggestion system',
      whyRoot: 'Help maintain consistent taxonomy across the knowledge base',
      microWin: 'Show existing tags as autocomplete suggestions when tagging',
    },
    transcript: `assistant: What would you like to focus on?

user: I want to help users tag notes consistently by suggesting existing tags.

assistant: [GOAL_CAPTURED]
Create tag suggestion system
Taxonomy consistency! Why is this important?

user: I have tags like "ai", "AI", "artificial-intelligence" for the same concept. It's chaos.

assistant: [WHY_CAPTURED]
Help maintain consistent taxonomy across the knowledge base
Chaos to order! What's one step you could take?

user: Show existing tags as autocomplete when users start typing a tag.

assistant: [MICROWIN_CAPTURED]
Show existing tags as autocomplete suggestions when tagging
Autocomplete is perfect. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Excellent! Bring order to the tag chaos.`,
    expectedNotes: [
      {
        titlePatterns: ['tag suggestion', 'autocomplete', 'taxonomy'],
        contentMustContain: ['tags', 'consistent', 'autocomplete', 'taxonomy'],
        purposePattern: /I am keeping this because.*(consistent|taxonomy|chaos)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/implement', '#UI/tags'],
        forbiddenTags: ['#tags', '#autocomplete'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Tag Taxonomy]]', '[[Autocomplete UX]]'],
        isSynthesis: true,
        synthesisIndicators: ['ai vs AI', 'chaos', 'same concept'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      themes: ['taxonomy', 'tagging', 'consistency'],
    },
  },
  {
    id: 'coaching-014',
    goal: {
      title: 'Implement bidirectional linking',
      whyRoot: 'Make knowledge connections discoverable from both directions',
      microWin: 'Show backlinks section at the bottom of each note',
    },
    transcript: `assistant: What goal would you like to work on?

user: I want to add bidirectional links like Roam Research has.

assistant: [GOAL_CAPTURED]
Implement bidirectional linking
Powerful feature! Why do backlinks matter to you?

user: When I link A to B, I want to see from B that A references it. Otherwise half the connections are invisible.

assistant: [WHY_CAPTURED]
Make knowledge connections discoverable from both directions
Both directions matter! What's one step you could take?

user: Add a "Backlinks" section at the bottom of each note showing what links to it.

assistant: [MICROWIN_CAPTURED]
Show backlinks section at the bottom of each note
Classic pattern. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Great! Your knowledge web will be fully navigable.`,
    expectedNotes: [
      {
        titlePatterns: ['bidirectional', 'backlinks', 'two-way links'],
        contentMustContain: ['bidirectional', 'backlinks', 'connections', 'discoverable'],
        purposePattern: /I am keeping this because.*(connections|discoverable|both directions)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/implement', '#decision/technical'],
        forbiddenTags: ['#links', '#backlinks'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Roam Research]]', '[[Knowledge Graphs]]'],
        isSynthesis: true,
        synthesisIndicators: ['half invisible', 'both directions', 'A to B'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      themes: ['linking', 'bidirectional', 'knowledge-graph'],
    },
  },
  {
    id: 'coaching-015',
    goal: {
      title: 'Build daily review prompt system',
      whyRoot: 'Surface forgotten insights at the right moment for spaced repetition',
      microWin: 'Show 3 random old notes when user opens the app',
    },
    transcript: `assistant: What would you like to focus on?

user: I want to surface old notes for review, like spaced repetition for knowledge.

assistant: [GOAL_CAPTURED]
Build daily review prompt system
Spaced repetition for notes! Why does this matter?

user: I write things and forget them. Regular resurfacing would help ideas stick and find new connections.

assistant: [WHY_CAPTURED]
Surface forgotten insights at the right moment for spaced repetition
Combating forgetting! What's one step you could take?

user: Show 3 random old notes when the user opens the app each day.

assistant: [MICROWIN_CAPTURED]
Show 3 random old notes when user opens the app
Simple but effective. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Wonderful! Your past wisdom will stay present.`,
    expectedNotes: [
      {
        titlePatterns: ['daily review', 'spaced repetition', 'resurfacing'],
        contentMustContain: ['review', 'spaced repetition', 'forgotten', 'resurface'],
        purposePattern: /I am keeping this because.*(forgotten|stick|spaced repetition)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Logic' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/implement', '#insight/core'],
        forbiddenTags: ['#review', '#spaced-repetition'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Spaced Repetition]]', '[[Knowledge Retention]]'],
        isSynthesis: true,
        synthesisIndicators: ['write and forget', 'ideas stick', 'new connections'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      themes: ['spaced-repetition', 'review', 'retention'],
    },
  },
  {
    id: 'coaching-016',
    goal: {
      title: 'Create note templates for different purposes',
      whyRoot: 'Reduce friction by providing structure for common note types',
      microWin: 'Design templates for meeting notes, book notes, and ideas',
    },
    transcript: `assistant: What goal would you like to work on?

user: I want to create templates for different types of notes.

assistant: [GOAL_CAPTURED]
Create note templates for different purposes
Structure helps! Why do templates matter to you?

user: Starting from blank is hard. Templates give me a scaffold so I can just fill in the blanks.

assistant: [WHY_CAPTURED]
Reduce friction by providing structure for common note types
Lower the starting barrier! What's one step you could take?

user: Design templates for the three most common types: meeting notes, book notes, and ideas.

assistant: [MICROWIN_CAPTURED]
Design templates for meeting notes, book notes, and ideas
Great selection. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Perfect! Scaffolding makes starting easy.`,
    expectedNotes: [
      {
        titlePatterns: ['templates', 'note templates', 'scaffolding'],
        contentMustContain: ['templates', 'structure', 'friction', 'scaffold'],
        purposePattern: /I am keeping this because.*(friction|structure|scaffold)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/design', '#UI/templates'],
        forbiddenTags: ['#templates', '#notes'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Note Types]]', '[[Structured Writing]]'],
        isSynthesis: true,
        synthesisIndicators: ['blank is hard', 'fill in blanks', 'scaffold'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'simple',
      themes: ['templates', 'structure', 'friction-reduction'],
    },
  },
  {
    id: 'coaching-017',
    goal: {
      title: 'Implement note versioning and history',
      whyRoot: 'Allow fearless editing by making all changes reversible',
      microWin: 'Store version history on each save with diff viewing',
    },
    transcript: `assistant: What would you like to focus on?

user: I want to track the history of note edits so users can see how ideas evolved.

assistant: [GOAL_CAPTURED]
Implement note versioning and history
Evolution tracking! Why does this matter?

user: I often regret edits. And seeing how an idea evolved over time reveals its development path.

assistant: [WHY_CAPTURED]
Allow fearless editing by making all changes reversible
Fearless editing! What's one step you could take?

user: Store a version on each save and add a diff viewer to see changes.

assistant: [MICROWIN_CAPTURED]
Store version history on each save with diff viewing
Technical foundation. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Great! Edit without fear.`,
    expectedNotes: [
      {
        titlePatterns: ['versioning', 'history', 'edit history'],
        contentMustContain: ['version', 'history', 'reversible', 'evolved'],
        purposePattern: /I am keeping this because.*(reversible|fearless|evolution)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/implement', '#decision/technical'],
        forbiddenTags: ['#versioning', '#history'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Version Control]]', '[[Diff Algorithms]]'],
        isSynthesis: true,
        synthesisIndicators: ['regret edits', 'evolved over time', 'development path'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      themes: ['versioning', 'history', 'reversibility'],
    },
  },
  {
    id: 'coaching-018',
    goal: {
      title: 'Add collaborative note editing',
      whyRoot: 'Enable shared thinking and knowledge building with others',
      microWin: 'Research CRDT libraries for real-time collaboration',
    },
    transcript: `assistant: What goal would you like to work on?

user: I want to add real-time collaboration so people can write together.

assistant: [GOAL_CAPTURED]
Add collaborative note editing
Collaborative knowledge! Why does this matter?

user: Some of my best ideas come from conversations. I want to capture that energy in shared writing.

assistant: [WHY_CAPTURED]
Enable shared thinking and knowledge building with others
Collaborative thinking! What's one step you could take?

user: Research CRDT libraries that handle real-time sync without conflicts.

assistant: [MICROWIN_CAPTURED]
Research CRDT libraries for real-time collaboration
Good technical research. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Exciting! Shared minds, shared knowledge.`,
    expectedNotes: [
      {
        titlePatterns: ['collaboration', 'real-time', 'shared editing'],
        contentMustContain: ['collaborative', 'real-time', 'shared', 'together'],
        purposePattern: /I am keeping this because.*(shared|together|collaborative)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#task/research', '#skill/distributed-systems'],
        forbiddenTags: ['#collaboration', '#real-time'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[CRDT]]', '[[Real-Time Sync]]'],
        isSynthesis: true,
        synthesisIndicators: ['best ideas from conversations', 'capture energy'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      themes: ['collaboration', 'real-time', 'distributed-systems'],
    },
  },
  {
    id: 'coaching-019',
    goal: {
      title: 'Build AI writing assistant integration',
      whyRoot: 'Augment human thinking with AI to overcome creative blocks',
      microWin: 'Add a "Continue writing" button that uses AI to extend the current paragraph',
    },
    transcript: `assistant: What would you like to focus on?

user: I want to integrate an AI writing assistant to help with creative blocks.

assistant: [GOAL_CAPTURED]
Build AI writing assistant integration
AI augmentation! Why does this matter to you?

user: Sometimes I get stuck staring at the page. AI could give me a push to keep going.

assistant: [WHY_CAPTURED]
Augment human thinking with AI to overcome creative blocks
Overcoming blocks! What's one step you could take?

user: Add a "Continue writing" button that uses AI to extend what I've written.

assistant: [MICROWIN_CAPTURED]
Add a "Continue writing" button that uses AI to extend the current paragraph
Focused feature. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Great! Never stare at a blank page again.`,
    expectedNotes: [
      {
        titlePatterns: ['AI assistant', 'writing assistant', 'AI augmentation'],
        contentMustContain: ['AI', 'writing', 'blocks', 'augment'],
        purposePattern: /I am keeping this because.*(blocks|stuck|augment)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/implement', '#skill/ai'],
        forbiddenTags: ['#ai', '#writing'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[AI Writing]]', '[[Creative Blocks]]'],
        isSynthesis: true,
        synthesisIndicators: ['stuck staring', 'push to keep going'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      themes: ['ai-augmentation', 'creativity', 'writing-assistance'],
    },
  },
  {
    id: 'coaching-020',
    goal: {
      title: 'Create writing prompts based on past notes',
      whyRoot: 'Stimulate new thinking by connecting to what you already know',
      microWin: 'Generate prompts like "How does X relate to your note about Y?"',
    },
    transcript: `assistant: What goal would you like to work on?

user: I want to generate writing prompts based on the user's existing notes.

assistant: [GOAL_CAPTURED]
Create writing prompts based on past notes
Personalized prompts! Why does this matter?

user: Generic prompts don't work for me. But prompts that connect to my existing ideas spark real thinking.

assistant: [WHY_CAPTURED]
Stimulate new thinking by connecting to what you already know
Building on existing knowledge! What's one step you could take?

user: Generate prompts like "How does X relate to your note about Y?"

assistant: [MICROWIN_CAPTURED]
Generate prompts like "How does X relate to your note about Y?"
Connection-based prompts. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Love it! Your knowledge will spark new knowledge.`,
    expectedNotes: [
      {
        titlePatterns: ['writing prompts', 'personalized prompts', 'prompt generation'],
        contentMustContain: ['prompts', 'existing notes', 'connect', 'thinking'],
        purposePattern: /I am keeping this because.*(connect|existing|spark)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Logic' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/implement', '#insight/core'],
        forbiddenTags: ['#prompts', '#writing'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Writing Prompts]]', '[[Knowledge Connections]]'],
        isSynthesis: true,
        synthesisIndicators: ['generic dont work', 'spark real thinking', 'existing ideas'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      themes: ['prompts', 'personalization', 'knowledge-building'],
    },
  },

  // ==========================================================================
  // Self-Improvement and Learning Focus (21-30)
  // ==========================================================================
  {
    id: 'coaching-021',
    goal: {
      title: 'Start daily journaling habit',
      whyRoot: 'Develop self-awareness through regular reflection',
      microWin: 'Write for 5 minutes every morning before checking phone',
    },
    transcript: `assistant: What goal would you like to work on?

user: I want to start journaling every day.

assistant: [GOAL_CAPTURED]
Start daily journaling habit
Beautiful habit! Why does daily writing matter to you?

user: I feel disconnected from my thoughts. Journaling would help me understand myself better.

assistant: [WHY_CAPTURED]
Develop self-awareness through regular reflection
Self-understanding through reflection! What's one step you could take?

user: Write for just 5 minutes every morning, before I check my phone.

assistant: [MICROWIN_CAPTURED]
Write for 5 minutes every morning before checking phone
Morning routine anchor. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Perfect! A small practice with big impact.`,
    expectedNotes: [
      {
        titlePatterns: ['daily journaling', 'journaling habit', 'morning writing'],
        contentMustContain: ['journaling', 'daily', 'self-awareness', 'reflection'],
        purposePattern: /I am keeping this because.*(self-awareness|understand|reflection)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/habit', '#insight/core'],
        forbiddenTags: ['#journaling', '#habit'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Morning Routine]]', '[[Self-Awareness]]'],
        isSynthesis: true,
        synthesisIndicators: ['disconnected from thoughts', 'understand myself'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'simple',
      themes: ['habits', 'self-improvement', 'reflection'],
    },
  },
  {
    id: 'coaching-022',
    goal: {
      title: 'Learn TypeScript deeply',
      whyRoot: 'Write more reliable code with fewer runtime errors',
      microWin: 'Complete the TypeScript handbook generics section',
    },
    transcript: `assistant: What would you like to focus on?

user: I want to really learn TypeScript, not just use it superficially.

assistant: [GOAL_CAPTURED]
Learn TypeScript deeply
Deep learning! Why does TypeScript mastery matter?

user: I keep making type errors that TypeScript should catch. I want to write code that's correct by construction.

assistant: [WHY_CAPTURED]
Write more reliable code with fewer runtime errors
Correctness by construction! What's one step you could take?

user: Work through the generics section of the TypeScript handbook this week.

assistant: [MICROWIN_CAPTURED]
Complete the TypeScript handbook generics section
Generics are key. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Great! Generics will unlock so much power.`,
    expectedNotes: [
      {
        titlePatterns: ['TypeScript', 'generics', 'type safety'],
        contentMustContain: ['TypeScript', 'generics', 'reliable', 'correct'],
        purposePattern: /I am keeping this because.*(reliable|correct|errors)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#skill/typescript', '#task/learn'],
        forbiddenTags: ['#typescript', '#learning'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[TypeScript Generics]]', '[[Type Safety]]'],
        isSynthesis: true,
        synthesisIndicators: ['superficially', 'correct by construction'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      themes: ['learning', 'typescript', 'programming'],
    },
  },
  {
    id: 'coaching-023',
    goal: {
      title: 'Read one book per month',
      whyRoot: 'Continuously expose myself to new ideas and perspectives',
      microWin: 'Start reading "Thinking, Fast and Slow" for 15 minutes before bed',
    },
    transcript: `assistant: What goal would you like to work on?

user: I want to read more books. I've barely read anything this year.

assistant: [GOAL_CAPTURED]
Read one book per month
Reading habit! Why does reading matter to you?

user: Books expose me to ideas I'd never encounter otherwise. I miss that intellectual stimulation.

assistant: [WHY_CAPTURED]
Continuously expose myself to new ideas and perspectives
New ideas and perspectives! What's one step you could take?

user: Start reading "Thinking, Fast and Slow" for 15 minutes before bed each night.

assistant: [MICROWIN_CAPTURED]
Start reading "Thinking, Fast and Slow" for 15 minutes before bed
Great book choice! Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Wonderful! Your before-bed ritual awaits.`,
    expectedNotes: [
      {
        titlePatterns: ['reading habit', 'book reading', 'continuous learning'],
        contentMustContain: ['reading', 'books', 'ideas', 'perspectives'],
        purposePattern: /I am keeping this because.*(ideas|perspectives|stimulation)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/habit', '#insight/core'],
        forbiddenTags: ['#reading', '#books'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Reading Habits]]', '[[Continuous Learning]]'],
        isSynthesis: true,
        synthesisIndicators: ['barely read', 'intellectual stimulation', 'never encounter'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'simple',
      themes: ['reading', 'habits', 'learning'],
    },
  },
  {
    id: 'coaching-024',
    goal: {
      title: 'Practice meditation for focus',
      whyRoot: 'Train my attention to be present rather than scattered',
      microWin: 'Use Headspace for 5 minutes after waking up',
    },
    transcript: `assistant: What would you like to focus on?

user: I want to start meditating to improve my focus.

assistant: [GOAL_CAPTURED]
Practice meditation for focus
Mindfulness! Why does focus matter to you?

user: My mind is always somewhere else. I want to train it to be present.

assistant: [WHY_CAPTURED]
Train my attention to be present rather than scattered
Present attention! What's one step you could take?

user: Use the Headspace app for 5 minutes right after waking up.

assistant: [MICROWIN_CAPTURED]
Use Headspace for 5 minutes after waking up
Morning meditation. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Beautiful! Training presence.`,
    expectedNotes: [
      {
        titlePatterns: ['meditation', 'focus', 'mindfulness', 'attention'],
        contentMustContain: ['meditation', 'focus', 'present', 'attention'],
        purposePattern: /I am keeping this because.*(present|focus|attention)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/habit', '#insight/core'],
        forbiddenTags: ['#meditation', '#mindfulness'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Mindfulness]]', '[[Attention Training]]'],
        isSynthesis: true,
        synthesisIndicators: ['always somewhere else', 'train it'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'simple',
      themes: ['meditation', 'focus', 'mindfulness'],
    },
  },
  {
    id: 'coaching-025',
    goal: {
      title: 'Exercise three times per week',
      whyRoot: 'Build physical resilience to support mental clarity',
      microWin: 'Go for a 30-minute walk on Monday, Wednesday, Friday',
    },
    transcript: `assistant: What goal would you like to work on?

user: I need to exercise more. I'm completely sedentary.

assistant: [GOAL_CAPTURED]
Exercise three times per week
Movement! Why does exercise matter to you?

user: When I'm physically active, my mind is sharper. I think better after moving.

assistant: [WHY_CAPTURED]
Build physical resilience to support mental clarity
Body-mind connection! What's one step you could take?

user: Go for a 30-minute walk on Monday, Wednesday, and Friday.

assistant: [MICROWIN_CAPTURED]
Go for a 30-minute walk on Monday, Wednesday, Friday
Walking is perfect. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Excellent! Your walks await.`,
    expectedNotes: [
      {
        titlePatterns: ['exercise', 'walking', 'physical activity'],
        contentMustContain: ['exercise', 'physical', 'mental clarity', 'movement'],
        purposePattern: /I am keeping this because.*(mental clarity|think better|sharper)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/habit', '#insight/core'],
        forbiddenTags: ['#exercise', '#health'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Body-Mind Connection]]', '[[Physical Activity]]'],
        isSynthesis: true,
        synthesisIndicators: ['mind is sharper', 'think better after moving'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'simple',
      themes: ['exercise', 'health', 'mental-clarity'],
    },
  },
  {
    id: 'coaching-026',
    goal: {
      title: 'Learn to play piano',
      whyRoot: 'Express emotions through music when words fail',
      microWin: 'Practice scales for 10 minutes daily using Simply Piano',
    },
    transcript: `assistant: What would you like to focus on?

user: I've always wanted to play piano.

assistant: [GOAL_CAPTURED]
Learn to play piano
Music! Why does piano matter to you?

user: Sometimes I feel things I can't put into words. Music can express what language can't.

assistant: [WHY_CAPTURED]
Express emotions through music when words fail
Beyond words! What's one step you could take?

user: Practice scales for 10 minutes every day using the Simply Piano app.

assistant: [MICROWIN_CAPTURED]
Practice scales for 10 minutes daily using Simply Piano
Daily practice. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Beautiful! Let the music speak.`,
    expectedNotes: [
      {
        titlePatterns: ['piano', 'music', 'learning instrument'],
        contentMustContain: ['piano', 'music', 'emotions', 'express'],
        purposePattern: /I am keeping this because.*(express|emotions|words fail)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#skill/piano', '#task/practice'],
        forbiddenTags: ['#music', '#piano'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Musical Expression]]', '[[Emotional Outlets]]'],
        isSynthesis: true,
        synthesisIndicators: ["can't put into words", 'express what language cant'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      themes: ['music', 'creativity', 'expression'],
    },
  },
  {
    id: 'coaching-027',
    goal: {
      title: 'Improve public speaking skills',
      whyRoot: 'Share ideas effectively and overcome fear of judgment',
      microWin: 'Record myself giving a 2-minute talk and watch it back',
    },
    transcript: `assistant: What goal would you like to work on?

user: I need to get better at public speaking. I freeze up in meetings.

assistant: [GOAL_CAPTURED]
Improve public speaking skills
Speaking skills! Why does this matter?

user: I have ideas worth sharing, but fear holds me back. I want to communicate without the anxiety.

assistant: [WHY_CAPTURED]
Share ideas effectively and overcome fear of judgment
Beyond fear! What's one step you could take?

user: Record myself giving a 2-minute talk on any topic and watch it back.

assistant: [MICROWIN_CAPTURED]
Record myself giving a 2-minute talk and watch it back
Self-observation. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Great! Watch yourself grow.`,
    expectedNotes: [
      {
        titlePatterns: ['public speaking', 'communication', 'presenting'],
        contentMustContain: ['speaking', 'fear', 'ideas', 'communicate'],
        purposePattern: /I am keeping this because.*(fear|communicate|share ideas)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#skill/speaking', '#task/practice'],
        forbiddenTags: ['#speaking', '#communication'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Public Speaking]]', '[[Fear of Judgment]]'],
        isSynthesis: true,
        synthesisIndicators: ['freeze up', 'ideas worth sharing', 'fear holds back'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      themes: ['speaking', 'fear', 'communication'],
    },
  },
  {
    id: 'coaching-028',
    goal: {
      title: 'Practice gratitude daily',
      whyRoot: 'Shift attention from what is lacking to what is abundant',
      microWin: 'Write three things I am grateful for before bed',
    },
    transcript: `assistant: What would you like to focus on?

user: I want to practice gratitude more intentionally.

assistant: [GOAL_CAPTURED]
Practice gratitude daily
Gratitude! Why does this matter to you?

user: I focus too much on what's missing. I want to appreciate what I already have.

assistant: [WHY_CAPTURED]
Shift attention from what is lacking to what is abundant
Abundance mindset! What's one step you could take?

user: Write three things I'm grateful for before going to bed each night.

assistant: [MICROWIN_CAPTURED]
Write three things I am grateful for before bed
Evening practice. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Wonderful! Abundance awaits.`,
    expectedNotes: [
      {
        titlePatterns: ['gratitude', 'abundance', 'appreciation'],
        contentMustContain: ['gratitude', 'appreciate', 'abundant'],
        purposePattern: /I am keeping this because.*(appreciate|abundant|lacking)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/habit', '#insight/core'],
        forbiddenTags: ['#gratitude', '#mindfulness'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Gratitude Practice]]', '[[Abundance Mindset]]'],
        isSynthesis: true,
        synthesisIndicators: ["what's missing", 'what I already have'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'simple',
      themes: ['gratitude', 'mindset', 'wellbeing'],
    },
  },
  {
    id: 'coaching-029',
    goal: {
      title: 'Reduce screen time before bed',
      whyRoot: 'Improve sleep quality by letting my mind wind down naturally',
      microWin: 'Put phone in another room 30 minutes before bed',
    },
    transcript: `assistant: What goal would you like to work on?

user: I need to stop using screens before bed. It's ruining my sleep.

assistant: [GOAL_CAPTURED]
Reduce screen time before bed
Sleep hygiene! Why does this matter?

user: I'm tired all day because I scroll until midnight. My mind needs time to wind down.

assistant: [WHY_CAPTURED]
Improve sleep quality by letting my mind wind down naturally
Natural wind-down! What's one step you could take?

user: Put my phone in another room 30 minutes before I plan to sleep.

assistant: [MICROWIN_CAPTURED]
Put phone in another room 30 minutes before bed
Physical separation. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Great! Better sleep ahead.`,
    expectedNotes: [
      {
        titlePatterns: ['screen time', 'sleep', 'digital wellness'],
        contentMustContain: ['screen', 'sleep', 'wind down'],
        purposePattern: /I am keeping this because.*(sleep|wind down|tired)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/habit', '#decision/personal'],
        forbiddenTags: ['#sleep', '#screen-time'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Sleep Hygiene]]', '[[Digital Wellness]]'],
        isSynthesis: true,
        synthesisIndicators: ['scroll until midnight', 'tired all day'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'simple',
      themes: ['sleep', 'digital-wellness', 'habits'],
    },
  },
  {
    id: 'coaching-030',
    goal: {
      title: 'Learn to cook healthy meals',
      whyRoot: 'Take control of nutrition to fuel body and mind optimally',
      microWin: 'Cook one new healthy recipe this weekend',
    },
    transcript: `assistant: What would you like to focus on?

user: I want to learn to cook healthy meals instead of ordering takeout.

assistant: [GOAL_CAPTURED]
Learn to cook healthy meals
Nourishment! Why does cooking matter?

user: I feel sluggish from fast food. Cooking would give me control over what fuels my body.

assistant: [WHY_CAPTURED]
Take control of nutrition to fuel body and mind optimally
Fuel optimization! What's one step you could take?

user: Cook one new healthy recipe this weekend.

assistant: [MICROWIN_CAPTURED]
Cook one new healthy recipe this weekend
One recipe at a time. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Delicious! Enjoy the process.`,
    expectedNotes: [
      {
        titlePatterns: ['cooking', 'healthy eating', 'nutrition'],
        contentMustContain: ['cook', 'healthy', 'nutrition', 'fuel'],
        purposePattern: /I am keeping this because.*(nutrition|fuel|control)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#skill/cooking', '#task/learn'],
        forbiddenTags: ['#cooking', '#health'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Healthy Eating]]', '[[Nutrition]]'],
        isSynthesis: true,
        synthesisIndicators: ['sluggish from fast food', 'control over what fuels'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'simple',
      themes: ['cooking', 'health', 'nutrition'],
    },
  },

  // ==========================================================================
  // AI and Technology Skills Focus (31-40)
  // ==========================================================================
  {
    id: 'coaching-031',
    goal: {
      title: 'Master prompt engineering',
      whyRoot: 'Communicate effectively with AI to leverage it as a thinking partner',
      microWin: 'Write 5 prompts for different use cases and compare results',
    },
    transcript: `assistant: What goal would you like to work on?

user: I want to get really good at prompt engineering for AI tools.

assistant: [GOAL_CAPTURED]
Master prompt engineering
AI mastery! Why does this matter?

user: AI is a thinking partner if you know how to talk to it. Bad prompts waste its potential.

assistant: [WHY_CAPTURED]
Communicate effectively with AI to leverage it as a thinking partner
AI as partner! What's one step you could take?

user: Write 5 different prompts for various use cases and compare how the AI responds.

assistant: [MICROWIN_CAPTURED]
Write 5 prompts for different use cases and compare results
Experimentation. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Great! Learn by experimenting.`,
    expectedNotes: [
      {
        titlePatterns: ['prompt engineering', 'AI prompts', 'AI communication'],
        contentMustContain: ['prompt', 'AI', 'communicate', 'thinking partner'],
        purposePattern: /I am keeping this because.*(AI|communicate|thinking partner)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#skill/prompt-engineering', '#task/practice'],
        forbiddenTags: ['#ai', '#prompts'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Prompt Engineering]]', '[[AI Communication]]'],
        isSynthesis: true,
        synthesisIndicators: ['thinking partner', 'know how to talk', 'bad prompts waste'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      themes: ['ai', 'prompt-engineering', 'skills'],
    },
  },
  {
    id: 'coaching-032',
    goal: {
      title: 'Build personal AI agents',
      whyRoot: 'Automate repetitive thinking to focus on creative work',
      microWin: 'Create a simple agent that summarizes my daily notes',
    },
    transcript: `assistant: What would you like to focus on?

user: I want to build my own AI agents to automate parts of my workflow.

assistant: [GOAL_CAPTURED]
Build personal AI agents
Automation! Why does this matter?

user: I repeat the same thinking patterns daily. Agents could handle that, freeing me for creative work.

assistant: [WHY_CAPTURED]
Automate repetitive thinking to focus on creative work
Creative freedom! What's one step you could take?

user: Build a simple agent that summarizes my daily notes each evening.

assistant: [MICROWIN_CAPTURED]
Create a simple agent that summarizes my daily notes
Starting simple. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Exciting! Your agent awaits.`,
    expectedNotes: [
      {
        titlePatterns: ['AI agents', 'automation', 'personal agents'],
        contentMustContain: ['agent', 'automate', 'creative', 'repetitive'],
        purposePattern: /I am keeping this because.*(automate|creative|repetitive)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/implement', '#skill/ai-agents'],
        forbiddenTags: ['#ai', '#automation'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[AI Agents]]', '[[Workflow Automation]]'],
        isSynthesis: true,
        synthesisIndicators: ['repeat same thinking', 'freeing for creative'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'complex',
      themes: ['ai-agents', 'automation', 'productivity'],
    },
  },
  {
    id: 'coaching-033',
    goal: {
      title: 'Understand LLM architecture',
      whyRoot: 'Know how the tool works to use it more effectively',
      microWin: 'Read the "Attention Is All You Need" paper summary',
    },
    transcript: `assistant: What goal would you like to work on?

user: I want to understand how large language models actually work.

assistant: [GOAL_CAPTURED]
Understand LLM architecture
Deep understanding! Why does this matter?

user: I use these tools daily without knowing how they work. Understanding the mechanism would help me use them better.

assistant: [WHY_CAPTURED]
Know how the tool works to use it more effectively
Understanding for effectiveness! What's one step you could take?

user: Read a summary of the "Attention Is All You Need" paper that introduced transformers.

assistant: [MICROWIN_CAPTURED]
Read the "Attention Is All You Need" paper summary
Foundational reading. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Great! Understanding unlocks power.`,
    expectedNotes: [
      {
        titlePatterns: ['LLM', 'transformers', 'architecture'],
        contentMustContain: ['LLM', 'understand', 'mechanism', 'transformers'],
        purposePattern: /I am keeping this because.*(understand|mechanism|effectively)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/learn', '#skill/ai'],
        forbiddenTags: ['#ai', '#llm'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Transformer Architecture]]', '[[Attention Mechanism]]'],
        isSynthesis: true,
        synthesisIndicators: ['without knowing how', 'use them better'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'complex',
      themes: ['ai', 'machine-learning', 'understanding'],
    },
  },
  {
    id: 'coaching-034',
    goal: {
      title: 'Learn vector databases',
      whyRoot: 'Enable semantic search to find meaning rather than just keywords',
      microWin: 'Set up Pinecone and index 100 documents',
    },
    transcript: `assistant: What would you like to focus on?

user: I want to learn about vector databases for semantic search.

assistant: [GOAL_CAPTURED]
Learn vector databases
Semantic power! Why does this matter?

user: Keyword search misses so much. Vector search finds meaning, which is what I actually want.

assistant: [WHY_CAPTURED]
Enable semantic search to find meaning rather than just keywords
Finding meaning! What's one step you could take?

user: Set up Pinecone and try indexing about 100 documents to see how it works.

assistant: [MICROWIN_CAPTURED]
Set up Pinecone and index 100 documents
Hands-on learning. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Excellent! Semantic search awaits.`,
    expectedNotes: [
      {
        titlePatterns: ['vector databases', 'semantic search', 'embeddings'],
        contentMustContain: ['vector', 'semantic', 'meaning', 'search'],
        purposePattern: /I am keeping this because.*(semantic|meaning|keywords)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/learn', '#skill/databases'],
        forbiddenTags: ['#vector', '#search'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[Vector Databases]]', '[[Semantic Search]]'],
        isSynthesis: true,
        synthesisIndicators: ['keyword search misses', 'finds meaning'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'moderate',
      themes: ['databases', 'semantic-search', 'ai'],
    },
  },
  {
    id: 'coaching-035',
    goal: {
      title: 'Build RAG application',
      whyRoot: 'Ground AI responses in my own knowledge rather than general training',
      microWin: 'Create a simple chatbot that answers from my notes',
    },
    transcript: `assistant: What goal would you like to work on?

user: I want to build a RAG application that uses my own documents.

assistant: [GOAL_CAPTURED]
Build RAG application
Personal AI! Why does this matter?

user: Generic AI gives generic answers. I want responses grounded in my specific knowledge.

assistant: [WHY_CAPTURED]
Ground AI responses in my own knowledge rather than general training
Personalized knowledge! What's one step you could take?

user: Create a simple chatbot that can answer questions based on my notes.

assistant: [MICROWIN_CAPTURED]
Create a simple chatbot that answers from my notes
MVP chatbot. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Great! Your knowledge, amplified.`,
    expectedNotes: [
      {
        titlePatterns: ['RAG', 'retrieval augmented', 'personal AI'],
        contentMustContain: ['RAG', 'knowledge', 'grounded', 'documents'],
        purposePattern: /I am keeping this because.*(grounded|personal|knowledge)/i,
        expectedProject: null,
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/implement', '#skill/ai'],
        forbiddenTags: ['#rag', '#ai'],
        expectedUpwardLink: null,
        expectedSidewaysLinks: ['[[RAG Architecture]]', '[[Personal Knowledge AI]]'],
        isSynthesis: true,
        synthesisIndicators: ['generic gives generic', 'my specific knowledge'],
      },
    ],
    metadata: {
      projectContext: '',
      complexity: 'complex',
      themes: ['rag', 'ai', 'personal-knowledge'],
    },
  },
  {
    id: 'coaching-036',
    goal: {
      title: 'Learn Supabase edge functions',
      whyRoot: 'Run server-side logic without managing infrastructure',
      microWin: 'Deploy a hello world edge function',
    },
    transcript: `assistant: What would you like to focus on?

user: I want to learn Supabase edge functions for serverless backend logic.

assistant: [GOAL_CAPTURED]
Learn Supabase edge functions
Serverless! Why does this matter?

user: I don't want to manage servers. Edge functions let me focus on logic, not infrastructure.

assistant: [WHY_CAPTURED]
Run server-side logic without managing infrastructure
Focus on logic! What's one step you could take?

user: Deploy a simple hello world edge function to understand the deployment flow.

assistant: [MICROWIN_CAPTURED]
Deploy a hello world edge function
Start simple. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Perfect! Serverless simplicity.`,
    expectedNotes: [
      {
        titlePatterns: ['edge functions', 'Supabase', 'serverless'],
        contentMustContain: ['edge function', 'serverless', 'infrastructure', 'logic'],
        purposePattern: /I am keeping this because.*(infrastructure|serverless|focus)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/learn', '#skill/supabase'],
        forbiddenTags: ['#serverless', '#supabase'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Supabase Edge Functions]]', '[[Serverless Architecture]]'],
        isSynthesis: true,
        synthesisIndicators: ["don't want to manage", 'focus on logic'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      themes: ['serverless', 'supabase', 'backend'],
    },
  },
  {
    id: 'coaching-037',
    goal: {
      title: 'Master React Server Components',
      whyRoot: 'Build faster apps by moving rendering to the server',
      microWin: 'Convert one component from client to server component',
    },
    transcript: `assistant: What goal would you like to work on?

user: I want to really understand React Server Components.

assistant: [GOAL_CAPTURED]
Master React Server Components
Modern React! Why does this matter?

user: Server components can make apps much faster. I want to know when to use them and when not to.

assistant: [WHY_CAPTURED]
Build faster apps by moving rendering to the server
Performance through architecture! What's one step you could take?

user: Take one existing client component and convert it to a server component.

assistant: [MICROWIN_CAPTURED]
Convert one component from client to server component
Learn by converting. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Great! Experience is the best teacher.`,
    expectedNotes: [
      {
        titlePatterns: ['React Server Components', 'RSC', 'server rendering'],
        contentMustContain: ['server component', 'faster', 'rendering'],
        purposePattern: /I am keeping this because.*(faster|server|rendering)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/learn', '#skill/react'],
        forbiddenTags: ['#react', '#server'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[React Server Components]]', '[[Client-Server Boundary]]'],
        isSynthesis: true,
        synthesisIndicators: ['when to use and when not', 'much faster'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      themes: ['react', 'performance', 'architecture'],
    },
  },
  {
    id: 'coaching-038',
    goal: {
      title: 'Learn D3.js for data visualization',
      whyRoot: 'Create custom visualizations that tell stories with data',
      microWin: 'Build a simple bar chart with real data',
    },
    transcript: `assistant: What would you like to focus on?

user: I want to learn D3.js for creating data visualizations.

assistant: [GOAL_CAPTURED]
Learn D3.js for data visualization
Visual storytelling! Why does this matter?

user: Standard charts are boring. D3 lets me create visualizations that actually tell stories.

assistant: [WHY_CAPTURED]
Create custom visualizations that tell stories with data
Data stories! What's one step you could take?

user: Build a simple bar chart using some real data I have.

assistant: [MICROWIN_CAPTURED]
Build a simple bar chart with real data
Start with basics. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Wonderful! Bring your data to life.`,
    expectedNotes: [
      {
        titlePatterns: ['D3.js', 'data visualization', 'charts'],
        contentMustContain: ['D3', 'visualization', 'stories', 'data'],
        purposePattern: /I am keeping this because.*(visualization|stories|data)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/learn', '#skill/d3'],
        forbiddenTags: ['#d3', '#visualization'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[D3.js]]', '[[Data Storytelling]]'],
        isSynthesis: true,
        synthesisIndicators: ['boring', 'tell stories'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      themes: ['visualization', 'd3', 'data'],
    },
  },
  {
    id: 'coaching-039',
    goal: {
      title: 'Understand database indexing',
      whyRoot: 'Write queries that scale as data grows',
      microWin: 'Add an index to slow query and measure the improvement',
    },
    transcript: `assistant: What goal would you like to work on?

user: I need to better understand database indexing.

assistant: [GOAL_CAPTURED]
Understand database indexing
Performance fundamentals! Why does this matter?

user: My app is fast now but will slow down as data grows. Proper indexing will keep it fast.

assistant: [WHY_CAPTURED]
Write queries that scale as data grows
Scaling for the future! What's one step you could take?

user: Find a slow query, add an index, and measure how much faster it gets.

assistant: [MICROWIN_CAPTURED]
Add an index to slow query and measure the improvement
Measure the impact. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Great! Data at scale.`,
    expectedNotes: [
      {
        titlePatterns: ['database indexing', 'indexes', 'query performance'],
        contentMustContain: ['index', 'query', 'scale', 'performance'],
        purposePattern: /I am keeping this because.*(scale|fast|performance)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/learn', '#skill/databases'],
        forbiddenTags: ['#database', '#indexing'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Database Indexing]]', '[[Query Optimization]]'],
        isSynthesis: true,
        synthesisIndicators: ['fast now but slow down', 'proper indexing'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      themes: ['databases', 'performance', 'scaling'],
    },
  },
  {
    id: 'coaching-040',
    goal: {
      title: 'Learn Tailwind CSS properly',
      whyRoot: 'Style faster by thinking in utility classes rather than custom CSS',
      microWin: 'Rebuild one component using only Tailwind classes',
    },
    transcript: `assistant: What would you like to focus on?

user: I want to learn Tailwind CSS properly instead of just copying classes.

assistant: [GOAL_CAPTURED]
Learn Tailwind CSS properly
Utility-first! Why does this matter?

user: I waste time writing custom CSS. Tailwind would let me style directly in my components, faster.

assistant: [WHY_CAPTURED]
Style faster by thinking in utility classes rather than custom CSS
Speed through constraints! What's one step you could take?

user: Take one component and rebuild it using only Tailwind classes, no custom CSS.

assistant: [MICROWIN_CAPTURED]
Rebuild one component using only Tailwind classes
Pure Tailwind. Ready to commit?

user: Yes!

assistant: [GOAL_COMPLETE]
Perfect! Embrace the utility.`,
    expectedNotes: [
      {
        titlePatterns: ['Tailwind', 'CSS', 'utility classes'],
        contentMustContain: ['Tailwind', 'utility', 'CSS', 'faster'],
        purposePattern: /I am keeping this because.*(faster|utility|custom CSS)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/learn', '#skill/tailwind'],
        forbiddenTags: ['#css', '#tailwind'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Tailwind CSS]]', '[[Utility-First CSS]]'],
        isSynthesis: true,
        synthesisIndicators: ['waste time', 'style directly', 'faster'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'simple',
      themes: ['css', 'tailwind', 'styling'],
    },
  },
]

/**
 * Get all coaching transcripts
 */
export function getAllCoachingTranscripts(): CoachingTranscriptFixture[] {
  return COACHING_TRANSCRIPTS
}

/**
 * Get transcripts by project context
 */
export function getTranscriptsByProject(project: string): CoachingTranscriptFixture[] {
  return COACHING_TRANSCRIPTS.filter((t) => t.metadata.projectContext === project)
}

/**
 * Get transcripts by complexity
 */
export function getTranscriptsByComplexity(complexity: 'simple' | 'moderate' | 'complex'): CoachingTranscriptFixture[] {
  return COACHING_TRANSCRIPTS.filter((t) => t.metadata.complexity === complexity)
}

/**
 * Get transcripts by theme
 */
export function getTranscriptsByTheme(theme: string): CoachingTranscriptFixture[] {
  return COACHING_TRANSCRIPTS.filter((t) => t.metadata.themes.includes(theme))
}
