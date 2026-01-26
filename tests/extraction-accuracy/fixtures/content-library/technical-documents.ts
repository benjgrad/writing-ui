/**
 * Technical Document Test Fixtures
 *
 * 30 technical documents covering code documentation, architecture decisions,
 * API design notes, debugging logs, and technical learning notes.
 */

import type { QualityExpectation, NoteStatus, NoteType, Stakeholder } from '../../quality/types'

export interface TechnicalDocumentFixture {
  id: string
  title: string
  content: string
  sourceType: 'technical'
  expectedNotes: QualityExpectation[]
  metadata: {
    projectContext: string
    complexity: 'simple' | 'moderate' | 'complex'
    documentType: 'code-doc' | 'architecture' | 'api-design' | 'debugging' | 'learning-note' | 'decision-record'
    themes: string[]
  }
}

export const TECHNICAL_DOCUMENTS: TechnicalDocumentFixture[] = [
  // ==========================================================================
  // Code Documentation (1-6)
  // ==========================================================================
  {
    id: 'tech-001',
    title: 'useAutoSave Hook Implementation Notes',
    content: `# useAutoSave Hook

## Purpose
This hook manages automatic saving of document content with debouncing to prevent excessive API calls.

## Key Design Decisions

1. **Debounce Interval**: Set to 2000ms after testing showed that 1000ms felt too aggressive and caused noticeable performance impact during fast typing, while 3000ms felt unresponsive.

2. **Dirty State Tracking**: We track a \`isDirty\` flag separately from the debounced save to provide immediate UI feedback (showing "Unsaved" indicator) while the actual save is debounced.

3. **Error Recovery**: On save failure, we:
   - Keep the dirty state true
   - Store content in localStorage as backup
   - Retry on next change or manual save

This approach ensures users never lose work even if the server is temporarily unreachable.

## Edge Cases Handled

- **Rapid typing then immediate navigation**: Save is forced synchronously in beforeunload handler
- **Tab becoming inactive**: Save immediately when document.hidden changes to true
- **Network reconnection**: Pending saves are flushed when navigator.onLine becomes true

## Performance Considerations

The hook uses useCallback extensively to prevent unnecessary re-renders. The save function itself is memoized with the document ID as dependency, so switching documents doesn't cause stale closures.

## Testing Notes

Integration tests should mock the API and verify:
1. Debouncing actually batches rapid changes
2. Dirty state is accurate
3. localStorage backup works
4. Beforeunload handler fires

The hook currently lacks unit tests - adding those would improve confidence in edge case handling.`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['useAutoSave', 'debouncing', 'auto-save architecture'],
        contentMustContain: ['debounce', 'dirty state', 'save', 'performance'],
        purposePattern: /I am keeping this because.*(save|performance|user experience)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/document', '#skill/react'],
        forbiddenTags: ['#hook', '#autosave'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[React Hooks]]', '[[Debouncing Patterns]]'],
        isSynthesis: true,
        synthesisIndicators: ['design decisions', 'edge cases', 'testing notes'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      documentType: 'code-doc',
      themes: ['hooks', 'state-management', 'performance'],
    },
  },
  {
    id: 'tech-002',
    title: 'Knowledge Graph Force Layout Implementation',
    content: `# Force-Directed Graph with D3

## Why D3 Over React-Force-Graph?

I chose raw D3.js over react-force-graph for several reasons:

1. **Full Control**: react-force-graph abstracts away the simulation, making it hard to customize forces
2. **Performance**: Direct SVG manipulation is faster than the abstraction layer
3. **Learning**: Understanding the underlying algorithm helps debug issues

## Force Configuration

The current configuration after much experimentation:

\`\`\`javascript
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).id(d => d.id).distance(100))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(30))
\`\`\`

### Why These Values?

- **Link distance 100**: Shorter distances (50-80) caused too much overlap. Longer (150+) made the graph too sparse.
- **Charge strength -300**: The default -30 wasn't enough repulsion. -300 keeps nodes readable without flying apart.
- **Collision radius 30**: Matches node visual radius plus padding.

## Performance Optimization

For graphs with 100+ nodes, I added:
- Tick limiting (only render every 3rd tick)
- Canvas fallback for 500+ nodes
- Pause simulation when graph is offscreen

The simulation naturally cools down (alpha decay), so after ~5 seconds it stops consuming CPU.

## Interaction Design

- **Drag**: Fixes the node position (alpha target 0.3 while dragging)
- **Double-click**: Resets fixed position, node rejoins simulation
- **Hover**: Highlights connected nodes by dimming others to 0.2 opacity

This creates an exploratory feel where users can "pin" nodes they're interested in.`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['force-directed', 'D3', 'graph layout', 'knowledge graph'],
        contentMustContain: ['D3', 'force', 'simulation', 'performance'],
        purposePattern: /I am keeping this because.*(graph|visualization|performance)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/document', '#skill/d3'],
        forbiddenTags: ['#d3', '#graph'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[D3.js]]', '[[Force-Directed Graphs]]'],
        isSynthesis: true,
        synthesisIndicators: ['why D3 over', 'experimentation', 'interaction design'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      documentType: 'code-doc',
      themes: ['visualization', 'd3', 'performance'],
    },
  },
  {
    id: 'tech-003',
    title: 'Supabase RLS Policies for Multi-User Notes',
    content: `# Row Level Security for Notes Table

## The Problem

Users should only see their own notes. Without RLS, any authenticated user could query all notes in the database.

## Policy Design

I implemented three policies:

### 1. Select Policy
\`\`\`sql
CREATE POLICY "Users can view own notes"
ON notes FOR SELECT
USING (auth.uid() = user_id);
\`\`\`

### 2. Insert Policy
\`\`\`sql
CREATE POLICY "Users can insert own notes"
ON notes FOR INSERT
WITH CHECK (auth.uid() = user_id);
\`\`\`

### 3. Update/Delete Policy
\`\`\`sql
CREATE POLICY "Users can modify own notes"
ON notes FOR UPDATE, DELETE
USING (auth.uid() = user_id);
\`\`\`

## Why Separate Policies?

I initially tried a single policy for all operations, but Supabase applies USING for read operations and WITH CHECK for write operations. Combining them caused INSERT to fail because USING was evaluated before the row existed.

## Testing Strategy

1. Create two test users
2. User A creates a note
3. Verify User B cannot select/update/delete that note
4. Verify User A can perform all operations

## Future Consideration: Shared Notes

When we add collaboration, we'll need to:
1. Add a \`note_shares\` junction table
2. Modify SELECT policy to OR with share check
3. Add separate policies for collaborator permissions (view vs edit)

This is more complex than team-based sharing because permissions are per-note, not per-workspace.`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['RLS', 'Row Level Security', 'Supabase policies'],
        contentMustContain: ['RLS', 'policy', 'auth.uid', 'security'],
        purposePattern: /I am keeping this because.*(security|isolation|multi-user)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#task/document', '#skill/supabase'],
        forbiddenTags: ['#security', '#database'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Supabase]]', '[[Database Security]]'],
        isSynthesis: true,
        synthesisIndicators: ['why separate policies', 'future consideration', 'testing strategy'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      documentType: 'code-doc',
      themes: ['security', 'supabase', 'database'],
    },
  },
  {
    id: 'tech-004',
    title: 'Custom Cursor Implementation for DreamEditor',
    content: `# Why We Built a Custom Cursor

## Background

The native textarea cursor doesn't give us control over:
- Cursor animation (we want a gentle pulse)
- Position during word fading (native cursor stays at end)
- Mobile virtual keyboard integration

## Architecture

Three components work together:

1. **Hidden textarea**: Captures input and provides mobile keyboard
2. **Visual cursor**: A styled div that we position manually
3. **Position calculator**: Maps character index to pixel position

## The Hard Part: Measuring Text

To position the cursor, we need to know where character N appears on screen. This is surprisingly difficult because:

- Fonts have variable-width characters
- Line breaks depend on container width
- Some characters combine (emoji, accents)

My solution: Create a hidden span with the text up to the cursor position, measure its width. This is what CodeMirror does.

\`\`\`typescript
function getCursorPosition(text: string, index: number): { x: number; y: number } {
  measureSpan.textContent = text.slice(0, index);
  const rect = measureSpan.getBoundingClientRect();
  // Handle line wrapping by checking if we exceeded container width
  // ...
}
\`\`\`

## Mobile Keyboard Challenge

iOS Safari doesn't fire input events reliably when the textarea is hidden. The workaround:
1. Keep textarea at opacity: 0 instead of display: none
2. Position it behind the visual cursor
3. Set font-size to 16px to prevent Safari zoom

## What I'd Do Differently

If starting over, I'd use a contenteditable div instead of textarea + overlay. It handles text measurement natively and gives more control over selection rendering.`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['custom cursor', 'text editor', 'cursor implementation'],
        contentMustContain: ['cursor', 'textarea', 'mobile', 'measure'],
        purposePattern: /I am keeping this because.*(cursor|editor|mobile)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/document', '#insight/core'],
        forbiddenTags: ['#cursor', '#editor'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Text Measurement]]', '[[Mobile Keyboards]]'],
        isSynthesis: true,
        synthesisIndicators: ['why we built', 'hard part', "what I'd do differently"],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      documentType: 'code-doc',
      themes: ['editor', 'mobile', 'dom-manipulation'],
    },
  },
  {
    id: 'tech-005',
    title: 'Word Fading Animation System',
    content: `# Animated Word Fading

## Concept

As users write, old words gradually fade away, creating a dreamlike writing experience where you can't easily re-read what you wrote. This encourages forward momentum.

## Animation Implementation

Each word is wrapped in a span with CSS transition:

\`\`\`css
.word {
  transition: opacity 2s ease-out;
}
.word.fading {
  opacity: 0.3;
}
.word.faded {
  opacity: 0;
}
\`\`\`

Words progress through states based on their age:
- 0-5 seconds: Full opacity
- 5-15 seconds: Fading (0.3 opacity)
- 15+ seconds: Faded (0 opacity, but still in DOM for undo)

## Performance Concern

Initially I used setInterval to check word ages every 100ms. This caused:
- 60+ words × 10 checks/second = 600 comparisons/second
- Visible jank when typing fast

The fix: Use CSS animations triggered once when word enters, instead of polling:

\`\`\`css
@keyframes wordFade {
  0% { opacity: 1; }
  33% { opacity: 1; }
  66% { opacity: 0.3; }
  100% { opacity: 0; }
}
.word {
  animation: wordFade 15s ease-out forwards;
}
\`\`\`

Now the browser handles timing, not JavaScript.

## Scroll Interaction

When users scroll up to re-read, fading pauses. This prevents the frustrating experience of words disappearing while you're looking at them. We detect scroll position relative to the bottom and toggle a .paused class.

## Accessibility Consideration

Added a setting to disable fading entirely for users who find it disorienting. The content is always preserved; only the visual presentation changes.`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['word fading', 'animation', 'CSS animation'],
        contentMustContain: ['fading', 'animation', 'opacity', 'performance'],
        purposePattern: /I am keeping this because.*(animation|fading|experience)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/document', '#UI/animation'],
        forbiddenTags: ['#animation', '#css'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[CSS Animations]]', '[[Performance Optimization]]'],
        isSynthesis: true,
        synthesisIndicators: ['concept', 'performance concern', 'accessibility'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      documentType: 'code-doc',
      themes: ['animation', 'performance', 'ux'],
    },
  },
  {
    id: 'tech-006',
    title: 'Goal State Machine Implementation',
    content: `# Goal Coaching State Machine

## Why a State Machine?

The coaching conversation follows a predictable flow:
1. Welcome → 2. Goal Discovery → 3. Why Drilling → 4. Micro-Win → 5. Confirmation → 6. Complete

A state machine makes this explicit in code, preventing impossible transitions (e.g., jumping from Welcome to Complete).

## XState vs Custom

I evaluated XState but decided against it because:
- Our state machine is simple (6 states, linear progression)
- XState adds 20KB to bundle
- Learning curve for team members

Instead, I used a simple reducer pattern:

\`\`\`typescript
type CoachingStage =
  | 'welcome' | 'goal_discovery' | 'why_drilling'
  | 'micro_win' | 'confirmation' | 'complete';

function coachingReducer(state: CoachingStage, action: Action): CoachingStage {
  switch (state) {
    case 'welcome':
      if (action.type === 'START') return 'goal_discovery';
      return state;
    case 'goal_discovery':
      if (action.type === 'GOAL_CAPTURED') return 'why_drilling';
      return state;
    // ... etc
  }
}
\`\`\`

## Marker-Based Parsing

The AI response includes markers like [GOAL_CAPTURED] to signal state transitions. This is more reliable than trying to infer transitions from natural language.

Parsing is simple:
1. Check if response contains marker
2. Extract data after marker
3. Dispatch corresponding action

## Future: Agent Architecture

The state machine works but is rigid. A ReAct agent would be more flexible:
- Tool calling instead of markers
- Ability to backtrack if user changes mind
- Dynamic questioning based on context

This is a larger refactor that requires prompt engineering expertise.`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['state machine', 'coaching flow', 'reducer pattern'],
        contentMustContain: ['state machine', 'stages', 'transitions', 'reducer'],
        purposePattern: /I am keeping this because.*(state|flow|architecture)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/document', '#decision/technical'],
        forbiddenTags: ['#state-machine', '#coaching'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[State Machines]]', '[[AI Agent Architecture]]'],
        isSynthesis: true,
        synthesisIndicators: ['why a state machine', 'XState vs custom', 'future agent'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      documentType: 'code-doc',
      themes: ['state-management', 'ai', 'architecture'],
    },
  },

  // ==========================================================================
  // Architecture Decision Records (7-12)
  // ==========================================================================
  {
    id: 'tech-007',
    title: 'ADR-001: Choosing Supabase over Firebase',
    content: `# ADR-001: Database Platform Selection

## Status
Accepted

## Context
We need a backend platform that provides:
- Authentication
- Database with real-time subscriptions
- File storage
- Edge functions for AI integration

Options considered:
1. Firebase (Firestore + Auth + Functions)
2. Supabase (PostgreSQL + Auth + Edge Functions)
3. Self-hosted (PostgreSQL + custom auth)

## Decision
We will use Supabase.

## Rationale

### Why not Firebase?
- **NoSQL limitations**: Firestore's document model doesn't support JOINs, making relationship queries (notes-to-tags, note-connections) expensive
- **Vendor lock-in**: Firebase Query Language is proprietary
- **Cost unpredictability**: Firestore charges per read, which explodes with real-time subscriptions

### Why not self-hosted?
- **Time**: Building auth and real-time from scratch delays MVP
- **Maintenance**: We're a small team; don't want to manage infrastructure

### Why Supabase?
- **PostgreSQL**: Full SQL support, proper foreign keys, efficient JOINs
- **Open source**: Can self-host later if needed
- **Edge Functions**: Deno-based, runs Claude API calls close to user
- **Row Level Security**: Database-native multi-tenancy
- **Predictable pricing**: Based on storage and compute, not reads

## Consequences

**Positive:**
- Familiar SQL mental model
- Strong data integrity through constraints
- Migration path to self-hosted if needed

**Negative:**
- Smaller community than Firebase
- Edge Functions are newer, less documented
- Must learn RLS policies

**Risks:**
- Supabase is a startup; could pivot or shut down
- Mitigation: PostgreSQL is portable; we can migrate

## Links
- Supabase vs Firebase comparison: https://supabase.com/alternatives/supabase-vs-firebase
- Our data model: [[Database Schema]]`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['ADR', 'database selection', 'Supabase decision'],
        contentMustContain: ['Supabase', 'Firebase', 'PostgreSQL', 'decision'],
        purposePattern: /I am keeping this because.*(decision|architecture|database)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Evergreen' as NoteStatus,
        expectedType: 'Logic' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#decision/technical', '#insight/core'],
        forbiddenTags: ['#database', '#supabase'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Supabase]]', '[[Firebase]]'],
        isSynthesis: true,
        synthesisIndicators: ['rationale', 'consequences', 'risks'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      documentType: 'decision-record',
      themes: ['architecture', 'database', 'vendor-selection'],
    },
  },
  {
    id: 'tech-008',
    title: 'ADR-002: Edge Functions vs API Routes for AI',
    content: `# ADR-002: AI API Architecture

## Status
Accepted

## Context
We need to call Claude API for:
- Note extraction (long-running, ~30s)
- Coaching responses (streaming, ~5-15s)
- Writing prompts (fast, ~2s)

Options:
1. Next.js API routes (Vercel serverless)
2. Supabase Edge Functions (Deno)
3. Dedicated backend service

## Decision
Use Supabase Edge Functions for extraction, Next.js API routes for streaming responses.

## Rationale

### Why split?

**Extraction (Edge Functions):**
- Long-running (up to 60s)
- Vercel has 10s timeout on Hobby, 60s on Pro
- Edge Functions have 400s timeout
- Runs in background, doesn't block UI

**Coaching/Prompts (API Routes):**
- Need streaming for responsive UX
- Next.js has great streaming support via Response
- Stays in same deployment as frontend

### Why not dedicated backend?
- Adds operational complexity
- We don't need custom runtime features
- Serverless handles our scale

## Consequences

**Positive:**
- Best tool for each job
- No timeout issues on extraction
- Fast streaming for interactive features

**Negative:**
- Two places to deploy AI code
- Different runtime environments (Deno vs Node)
- Must keep prompts in sync

**Mitigation:**
- Shared prompt library in /src/lib/ai/prompts
- Environment variables for API keys in both places

## Implementation Notes
- Edge Functions deployed via \`supabase functions deploy\`
- API routes deployed with Vercel
- Both use same Anthropic SDK (works in Deno and Node)`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['ADR', 'AI architecture', 'Edge Functions decision'],
        contentMustContain: ['Edge Functions', 'API routes', 'streaming', 'timeout'],
        purposePattern: /I am keeping this because.*(AI|architecture|streaming)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Evergreen' as NoteStatus,
        expectedType: 'Logic' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#decision/technical', '#insight/core'],
        forbiddenTags: ['#api', '#serverless'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Edge Functions]]', '[[Streaming Responses]]'],
        isSynthesis: true,
        synthesisIndicators: ['why split', 'consequences', 'mitigation'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      documentType: 'decision-record',
      themes: ['architecture', 'ai', 'serverless'],
    },
  },
  {
    id: 'tech-009',
    title: 'ADR-003: Atomic Note Storage Model',
    content: `# ADR-003: Atomic Note Data Model

## Status
Accepted

## Context
We're building Zettelkasten-style note extraction. Need to decide:
- How to store atomic notes
- How to track connections between notes
- How to handle note consolidation/merging

## Decision
Implement a three-table model: notes, note_connections, note_history.

## Schema

### notes
\`\`\`sql
CREATE TABLE notes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status note_status DEFAULT 'Seed',
  note_type note_type_enum,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  source_ids UUID[] -- documents/sessions this was extracted from
);
\`\`\`

### note_connections
\`\`\`sql
CREATE TABLE note_connections (
  id UUID PRIMARY KEY,
  source_note_id UUID REFERENCES notes,
  target_note_id UUID REFERENCES notes,
  connection_type TEXT, -- 'related', 'extends', 'contradicts', etc.
  strength FLOAT DEFAULT 0.5,
  created_at TIMESTAMPTZ
);
\`\`\`

### note_history
\`\`\`sql
CREATE TABLE note_history (
  id UUID PRIMARY KEY,
  note_id UUID REFERENCES notes,
  previous_content TEXT,
  change_reason TEXT, -- 'consolidation', 'manual_edit', etc.
  changed_at TIMESTAMPTZ
);
\`\`\`

## Rationale

### Why arrays for tags and source_ids?
- PostgreSQL arrays are indexed with GIN
- Simpler than junction tables for many-to-many
- Good enough for our scale (< 10 tags/sources per note)

### Why connection_type as TEXT vs ENUM?
- Connection types may evolve (AI might discover new patterns)
- Easier to add new types without migration
- We enforce known types in application layer

### Why note_history?
- Consolidation merges notes, changing content
- Users might want to see evolution
- Helps debug extraction quality

## Consequences

**Positive:**
- Clean separation of concerns
- Efficient queries for graph visualization
- Audit trail for changes

**Negative:**
- Must maintain referential integrity manually for soft deletes
- Array fields don't support complex queries well

## Migration Path
If arrays become a bottleneck, we can add junction tables without changing the API.`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['ADR', 'note data model', 'atomic notes schema'],
        contentMustContain: ['schema', 'notes', 'connections', 'history'],
        purposePattern: /I am keeping this because.*(data model|schema|storage)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Evergreen' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#decision/technical', '#skill/databases'],
        forbiddenTags: ['#database', '#schema'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Zettelkasten Method]]', '[[Database Design]]'],
        isSynthesis: true,
        synthesisIndicators: ['rationale', 'why arrays', 'migration path'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      documentType: 'decision-record',
      themes: ['database', 'data-modeling', 'zettelkasten'],
    },
  },
  {
    id: 'tech-010',
    title: 'ADR-004: CSS-in-JS vs CSS Modules vs Tailwind',
    content: `# ADR-004: Styling Approach

## Status
Accepted

## Context
Need a styling system that supports:
- Dark mode
- Component-level styles
- Responsive design
- Theming

Options:
1. CSS-in-JS (styled-components, emotion)
2. CSS Modules
3. Tailwind CSS
4. Vanilla CSS with custom properties

## Decision
Use Tailwind CSS with CSS custom properties for theming.

## Rationale

### Why not CSS-in-JS?
- Runtime overhead (style injection)
- Larger bundle size
- Harder to cache styles
- React Server Components don't support runtime CSS-in-JS

### Why not CSS Modules?
- Good for isolation but verbose
- No utility classes means lots of custom CSS
- Harder to maintain consistency

### Why Tailwind?
- Utility-first reduces custom CSS dramatically
- Built-in responsive design (sm:, md:, lg:)
- PurgeCSS eliminates unused styles (tiny bundle)
- Consistent design system out of the box
- Works with Server Components

### Theming with CSS Custom Properties
Tailwind doesn't handle dynamic themes well, so we add:

\`\`\`css
:root {
  --background: 255 255 255;
  --foreground: 0 0 0;
}
.dark {
  --background: 10 10 10;
  --foreground: 255 255 255;
}
\`\`\`

Then in tailwind.config:
\`\`\`javascript
theme: {
  colors: {
    background: 'rgb(var(--background))',
    foreground: 'rgb(var(--foreground))',
  }
}
\`\`\`

## Consequences

**Positive:**
- Fast development with utility classes
- Tiny production CSS (< 10KB)
- Consistent spacing, colors, typography
- Easy dark mode with dark: prefix

**Negative:**
- HTML can get verbose with many classes
- Team must learn Tailwind conventions
- Some complex styles still need custom CSS

**Mitigation:**
- Use @apply for repeated patterns
- Component composition to encapsulate class lists
- Headless UI for complex interactive components`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['ADR', 'styling decision', 'Tailwind CSS'],
        contentMustContain: ['Tailwind', 'CSS', 'theming', 'custom properties'],
        purposePattern: /I am keeping this because.*(styling|CSS|theming)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Evergreen' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#decision/technical', '#skill/tailwind'],
        forbiddenTags: ['#css', '#styling'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Tailwind CSS]]', '[[CSS Custom Properties]]'],
        isSynthesis: true,
        synthesisIndicators: ['why not', 'consequences', 'mitigation'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      documentType: 'decision-record',
      themes: ['css', 'tailwind', 'design-system'],
    },
  },
  {
    id: 'tech-011',
    title: 'ADR-005: Real-Time Sync Strategy',
    content: `# ADR-005: Real-Time Data Synchronization

## Status
Accepted (with reservations)

## Context
The app needs real-time features:
- Live coaching messages
- Collaborative editing (future)
- Note connection updates from background extraction

Options:
1. Supabase Realtime (PostgreSQL CDC)
2. WebSockets with custom server
3. Polling
4. Server-Sent Events

## Decision
Use Supabase Realtime for note updates, polling for coaching status.

## Rationale

### Why Supabase Realtime for notes?
- Built-in, no extra infrastructure
- PostgreSQL Change Data Capture is robust
- Handles reconnection automatically
- Filters at database level (no unnecessary messages)

### Why polling for coaching?
Coaching sessions are short-lived (~5 minutes). Setting up a real-time subscription for each session:
- Adds connection overhead
- Requires cleanup on session end
- Overkill for low-frequency updates

Polling every 2 seconds is simpler and sufficient.

### Why not WebSockets everywhere?
- Would need to maintain connection state
- Supabase handles this better than we could
- Don't want to manage WebSocket server

## Implementation

### Note subscriptions:
\`\`\`typescript
supabase
  .channel('notes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'notes',
    filter: \`user_id=eq.\${userId}\`
  }, handleChange)
  .subscribe()
\`\`\`

### Coaching polling:
\`\`\`typescript
const pollCoaching = setInterval(async () => {
  const { data } = await supabase
    .from('coaching_messages')
    .select()
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(10);
  // Update state if new messages
}, 2000);
\`\`\`

## Reservations

Real-time subscription count is limited on Supabase free tier. If we add collaborative features, we may hit limits and need to upgrade or find alternative.

## Consequences

**Positive:**
- Simple implementation
- No custom server infrastructure
- Reliable with automatic reconnection

**Negative:**
- Tied to Supabase's real-time implementation
- Limited flexibility for complex sync scenarios
- Polling isn't instant (2s delay acceptable for coaching)`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['ADR', 'real-time sync', 'Supabase Realtime'],
        contentMustContain: ['real-time', 'sync', 'subscription', 'polling'],
        purposePattern: /I am keeping this because.*(real-time|sync|subscription)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Evergreen' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#decision/technical', '#skill/supabase'],
        forbiddenTags: ['#realtime', '#sync'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Real-Time Sync]]', '[[Supabase Realtime]]'],
        isSynthesis: true,
        synthesisIndicators: ['reservations', 'why not', 'implementation'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      documentType: 'decision-record',
      themes: ['real-time', 'sync', 'architecture'],
    },
  },
  {
    id: 'tech-012',
    title: 'ADR-006: Testing Strategy',
    content: `# ADR-006: Testing Strategy

## Status
Accepted

## Context
Need testing approach that balances:
- Confidence in critical paths
- Development velocity
- Maintenance burden
- CI/CD integration

## Decision
Adopt the "Testing Trophy" approach: heavy on integration tests, light on unit tests, with E2E for critical user journeys.

## Test Distribution

### E2E Tests (Playwright) - 20%
- Authentication flow
- Goal creation and coaching
- Note writing and saving
- Knowledge graph interaction

### Integration Tests (Vitest + Testing Library) - 60%
- Hook behavior with mocked Supabase
- Component rendering with state
- API route handlers
- Extraction pipeline

### Unit Tests (Vitest) - 20%
- Pure utility functions
- State machine transitions
- Parser functions

## Rationale

### Why not more unit tests?
- React components are mostly wiring (state → UI)
- Testing internal implementation is fragile
- Integration tests catch more real bugs

### Why not more E2E tests?
- Slow (5-30s per test)
- Flaky (network, timing issues)
- Expensive to maintain

### Why Playwright over Cypress?
- Faster execution
- Better multi-browser support
- Built-in screenshot/video
- Simpler API

### Why Vitest over Jest?
- 10x faster (native ESM)
- Same API (easy migration)
- Better TypeScript support

## Test Infrastructure

\`\`\`
tests/
  e2e/           # Playwright E2E tests
  integration/   # Vitest integration tests
  unit/          # Vitest unit tests
  fixtures/      # Shared test data
  mocks/         # Mock implementations
\`\`\`

## CI Pipeline
1. Unit + Integration: ~30 seconds, run on every push
2. E2E: ~3 minutes, run on PR only
3. Visual regression: Weekly, compare screenshots

## Consequences

**Positive:**
- Good coverage of user-facing behavior
- Fast feedback in development
- Catches integration issues early

**Negative:**
- Integration tests need mock maintenance
- E2E tests require test user setup
- Less coverage of edge cases in pure logic`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['ADR', 'testing strategy', 'testing trophy'],
        contentMustContain: ['testing', 'E2E', 'integration', 'unit'],
        purposePattern: /I am keeping this because.*(testing|quality|confidence)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Evergreen' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#decision/technical', '#skill/testing'],
        forbiddenTags: ['#testing', '#qa'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Testing Trophy]]', '[[Playwright]]'],
        isSynthesis: true,
        synthesisIndicators: ['why not more', 'rationale', 'CI pipeline'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      documentType: 'decision-record',
      themes: ['testing', 'ci-cd', 'quality'],
    },
  },

  // ==========================================================================
  // API Design Notes (13-18)
  // ==========================================================================
  {
    id: 'tech-013',
    title: 'Extraction API Design Notes',
    content: `# Knowledge Extraction API

## Endpoint Design

### POST /api/extraction/queue
Queues a document for extraction.

Request:
\`\`\`json
{
  "documentId": "uuid",
  "priority": "normal" | "high"
}
\`\`\`

Response:
\`\`\`json
{
  "jobId": "uuid",
  "status": "queued",
  "estimatedTime": 30
}
\`\`\`

### GET /api/extraction/status/:jobId
Polls extraction status.

Response:
\`\`\`json
{
  "jobId": "uuid",
  "status": "processing" | "complete" | "failed",
  "progress": 0.6,
  "extractedNotes": [...] // only when complete
}
\`\`\`

## Design Decisions

### Why async queue instead of sync?
- Extraction takes 20-60 seconds
- HTTP timeout would kill the request
- Users can navigate away and come back

### Why polling instead of webhooks?
- Simpler client implementation
- No need to expose callback endpoints
- Works with serverless (no persistent connections)

### Rate Limiting
- 10 extractions per user per hour
- Prevents abuse of Claude API
- High priority jobs bypass limit (for real-time coaching)

### Error Handling
- Transient failures: Auto-retry 3 times with exponential backoff
- Permanent failures: Mark as failed, return error to user
- Partial success: Return extracted notes, flag incomplete

## Future Considerations

### Batch Extraction
Allow queuing multiple documents at once for users who import a lot of content. Would need:
- Job grouping
- Aggregate progress tracking
- Prioritization within batch

### Streaming Progress
Instead of polling, could use Server-Sent Events for live progress updates. Would improve UX but adds complexity.`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['extraction API', 'API design', 'queue API'],
        contentMustContain: ['API', 'queue', 'extraction', 'polling'],
        purposePattern: /I am keeping this because.*(API|extraction|design)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/design', '#skill/api-design'],
        forbiddenTags: ['#api', '#extraction'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[API Design Patterns]]', '[[Async Job Processing]]'],
        isSynthesis: true,
        synthesisIndicators: ['why async', 'why polling', 'future considerations'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      documentType: 'api-design',
      themes: ['api', 'async', 'extraction'],
    },
  },
  {
    id: 'tech-014',
    title: 'Goal Coach API Streaming Design',
    content: `# Streaming API for Goal Coach

## The Problem
Claude responses take 5-15 seconds. Waiting for the full response feels slow. Streaming shows words as they generate, creating a conversational feel.

## Implementation

### Server (Next.js API Route)
\`\`\`typescript
export async function POST(request: Request) {
  const { messages, goalId } = await request.json();

  const stream = await anthropic.messages.stream({
    model: 'claude-3-sonnet-20240229',
    messages,
    max_tokens: 1000,
    system: COACHING_SYSTEM_PROMPT,
  });

  return new Response(stream.toReadableStream(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
\`\`\`

### Client (React)
\`\`\`typescript
async function streamMessage(userMessage: string) {
  const response = await fetch('/api/ai/coach', {
    method: 'POST',
    body: JSON.stringify({ messages, goalId }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    setStreamedResponse(prev => prev + text);
  }
}
\`\`\`

## Chunking Strategy

Claude streams at token level (individual words/subwords). For UI smoothness, we buffer and display at word boundaries:

\`\`\`typescript
let buffer = '';
function processChunk(chunk: string) {
  buffer += chunk;
  const words = buffer.split(' ');
  if (words.length > 1) {
    displayWords(words.slice(0, -1));
    buffer = words[words.length - 1];
  }
}
\`\`\`

This prevents partial words from flashing on screen.

## Error Handling

Streaming complicates error handling because we've already started sending response. Our approach:
1. If error occurs mid-stream, send error marker: [ERROR: message]
2. Client detects marker and shows error UI
3. Partial response is preserved (user can see what was generated)

## Reconnection

If connection drops mid-stream:
1. Client stores partial response
2. On reconnect, send partial response in request
3. Server continues from where it left off (Claude supports this via conversation history)`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['streaming API', 'Coach streaming', 'real-time responses'],
        contentMustContain: ['streaming', 'Claude', 'chunks', 'real-time'],
        purposePattern: /I am keeping this because.*(streaming|real-time|UX)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/document', '#skill/streaming'],
        forbiddenTags: ['#streaming', '#api'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Streaming Responses]]', '[[Claude API]]'],
        isSynthesis: true,
        synthesisIndicators: ['the problem', 'chunking strategy', 'error handling'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      documentType: 'api-design',
      themes: ['streaming', 'ai', 'ux'],
    },
  },
  {
    id: 'tech-015',
    title: 'Graph Query API Optimization',
    content: `# Knowledge Graph Query API

## Challenge
The graph needs to display:
- All user's notes (potentially hundreds)
- All connections between notes
- Filter by tags, date, search

Single query returning everything is slow and wasteful.

## Solution: Paginated + Cached Approach

### Initial Load
\`\`\`
GET /api/graph/nodes?limit=50&sort=recent
GET /api/graph/edges?nodeIds=[...first 50 node IDs]
\`\`\`

Load 50 most recent notes first. Graph is interactive immediately.

### Lazy Loading
As user zooms/pans, load more nodes in viewport:
\`\`\`
GET /api/graph/nodes?after=lastNodeId&limit=20
GET /api/graph/edges?nodeIds=[...new node IDs]
\`\`\`

### Edge Query Optimization

Originally I fetched edges for each node individually. This caused N+1 problem.

Fixed by batching:
\`\`\`sql
SELECT * FROM note_connections
WHERE source_note_id = ANY($1) OR target_note_id = ANY($1)
\`\`\`

Single query for all edges involving the loaded nodes.

### Caching Strategy

Graph data changes infrequently (only on extraction or manual edit). We cache aggressively:

1. **Browser**: 5-minute cache in memory
2. **CDN**: 1-minute cache at edge (invalidated on write)
3. **Database**: Materialized view for complex aggregations

### Filter Application

Filters apply client-side to cached data. This is faster than re-fetching with server-side filters for typical operations (tag toggle, date slider).

Exception: Full-text search hits the server because it needs trigram index.

## Performance Results

Before optimization:
- Initial load: 3.2s
- Filter apply: 800ms (server round-trip)

After optimization:
- Initial load: 400ms
- Filter apply: 50ms (client-side)

## Future: Virtual Scrolling for Large Graphs

For users with 1000+ notes, we'll need virtual scrolling:
- Only render nodes in visible viewport
- Use spatial index (R-tree) for efficient "nodes in rect" queries
- Aggregate distant nodes into clusters`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['graph API', 'query optimization', 'graph performance'],
        contentMustContain: ['graph', 'query', 'caching', 'pagination'],
        purposePattern: /I am keeping this because.*(performance|graph|optimization)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/optimize', '#skill/databases'],
        forbiddenTags: ['#graph', '#api'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Query Optimization]]', '[[Caching Strategies]]'],
        isSynthesis: true,
        synthesisIndicators: ['challenge', 'solution', 'performance results'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      documentType: 'api-design',
      themes: ['performance', 'api', 'graph'],
    },
  },
  {
    id: 'tech-016',
    title: 'Authentication Flow Design',
    content: `# Authentication Flow

## Providers
We support:
1. Email/Password (via Supabase Auth)
2. Google OAuth (planned)
3. Apple Sign-In (planned for iOS)

## Flow: Email/Password

### Sign Up
1. User enters email + password
2. Client calls \`supabase.auth.signUp()\`
3. Supabase sends confirmation email
4. User clicks link, confirms email
5. Redirect to app with session

### Sign In
1. User enters email + password
2. Client calls \`supabase.auth.signInWithPassword()\`
3. Supabase returns session (access_token + refresh_token)
4. Client stores tokens in httpOnly cookies

## Token Management

### Access Token
- JWT, 1 hour expiry
- Contains user_id, email, role
- Sent in Authorization header to API routes

### Refresh Token
- Opaque string, 60 day expiry
- Stored in secure httpOnly cookie
- Used to get new access token when expired

### Auto-Refresh
Supabase client handles refresh automatically:
\`\`\`typescript
const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  }
});
\`\`\`

## Session Persistence

### Problem
Next.js server components need session info, but cookies are set client-side.

### Solution
Middleware checks session on every request:
\`\`\`typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session && isProtectedRoute(request.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
\`\`\`

## Security Considerations

1. **CSRF**: Supabase uses PKCE flow, no CSRF tokens needed
2. **XSS**: Tokens in httpOnly cookies, not accessible to JavaScript
3. **Token Theft**: Short access token expiry limits damage
4. **Brute Force**: Supabase has built-in rate limiting

## Logout Flow
1. Client calls \`supabase.auth.signOut()\`
2. Clear local session
3. Revoke refresh token on server
4. Redirect to login page immediately (don't wait for state update)`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['authentication', 'auth flow', 'session management'],
        contentMustContain: ['authentication', 'token', 'session', 'OAuth'],
        purposePattern: /I am keeping this because.*(auth|security|session)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#task/document', '#skill/security'],
        forbiddenTags: ['#auth', '#security'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Supabase Auth]]', '[[JWT Tokens]]'],
        isSynthesis: true,
        synthesisIndicators: ['problem', 'solution', 'security considerations'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      documentType: 'api-design',
      themes: ['authentication', 'security', 'session'],
    },
  },
  {
    id: 'tech-017',
    title: 'Prompt Engineering API Design',
    content: `# Writing Prompt Generation API

## Endpoint
POST /api/ai/prompt

## Request
\`\`\`json
{
  "userId": "uuid",
  "context": {
    "recentNotes": ["title1", "title2"],
    "currentGoals": ["goal1"],
    "writingHistory": ["last 500 chars"],
    "timeOfDay": "morning"
  }
}
\`\`\`

## Response
\`\`\`json
{
  "prompt": "How does your morning routine influence...",
  "type": "reflection" | "connection" | "exploration",
  "relatedNotes": ["noteId1", "noteId2"]
}
\`\`\`

## Prompt Generation Strategy

### Context Window Usage
Claude has limited context. We prioritize:
1. System prompt with prompt generation instructions (500 tokens)
2. User's active goals (200 tokens)
3. Titles of recent notes (100 tokens)
4. Last writing session snippet (200 tokens)

Total: ~1000 tokens, leaving room for generation.

### Prompt Types

1. **Reflection**: "What does X mean to you?"
   - Generated when user hasn't written in 24+ hours
   - Draws from goals and recent notes

2. **Connection**: "How does X relate to Y?"
   - Generated when graph shows isolated clusters
   - Encourages linking ideas

3. **Exploration**: "What would happen if..."
   - Generated when user has been writing similar topics
   - Pushes into new territory

### Personalization

Prompts reference user's actual notes and goals:
- Bad: "Write about something you're grateful for"
- Good: "You mentioned wanting to improve your public speaking (from goal). How might the breathing exercises from your meditation practice (from notes) help with that?"

### Caching

Prompts are pre-generated in batches of 10 during off-peak hours. When user requests prompt:
1. Check cache for unused prompt
2. If available, return from cache (fast)
3. If not, generate on-demand (slower)

Cache invalidates when user adds new goals or significant notes.

## Error Handling

If Claude API fails:
1. Return fallback generic prompt from curated list
2. Log error for monitoring
3. Do not expose API error to user`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['prompt API', 'writing prompts', 'prompt generation'],
        contentMustContain: ['prompt', 'generation', 'personalization', 'context'],
        purposePattern: /I am keeping this because.*(prompt|writing|personalization)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/design', '#skill/prompt-engineering'],
        forbiddenTags: ['#prompts', '#api'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Prompt Engineering]]', '[[Personalization]]'],
        isSynthesis: true,
        synthesisIndicators: ['strategy', 'personalization', 'caching'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      documentType: 'api-design',
      themes: ['ai', 'prompts', 'personalization'],
    },
  },
  {
    id: 'tech-018',
    title: 'Webhook Design for Background Jobs',
    content: `# Background Job Webhooks

## Use Case
After extraction completes, we need to:
1. Update goal momentum meters
2. Send notification to user (if enabled)
3. Trigger cross-document analysis

## Architecture

### Job Completion Webhook
When Edge Function completes extraction:
\`\`\`
POST /api/webhooks/extraction-complete
Authorization: Bearer <internal_secret>
{
  "jobId": "uuid",
  "userId": "uuid",
  "documentId": "uuid",
  "extractedNoteIds": ["uuid1", "uuid2"],
  "status": "success" | "partial" | "failed"
}
\`\`\`

### Security
- Webhook endpoint only accepts requests with internal secret
- Secret rotated monthly
- IP allowlist for Supabase Edge Function IPs

### Idempotency
Jobs might retry and send duplicate webhooks. Handle via:
\`\`\`typescript
const processed = await redis.get(\`webhook:\${jobId}\`);
if (processed) return { already: true };
await redis.set(\`webhook:\${jobId}\`, '1', 'EX', 3600);
\`\`\`

### Downstream Jobs

1. **Goal Momentum Update**
   - Analyze new notes for goal-related content
   - Update momentum score (0-100)
   - Takes ~5 seconds

2. **Notification**
   - Check user preferences
   - Send email/push if enabled
   - Takes ~1 second

3. **Cross-Document Analysis**
   - Find connections between new notes and existing
   - Update note_connections table
   - Takes ~10 seconds

### Job Orchestration

Jobs run in parallel when possible:
\`\`\`
extraction-complete
    ├── momentum-update (async)
    ├── notification (async)
    └── cross-doc-analysis (async)
\`\`\`

Each job has its own retry policy and failure handling.

### Monitoring

Log all webhook calls with:
- Job ID
- Processing time
- Success/failure
- Downstream job statuses

Dashboard shows:
- Webhook volume over time
- Failure rate
- Average processing time`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['webhooks', 'background jobs', 'job orchestration'],
        contentMustContain: ['webhook', 'job', 'async', 'orchestration'],
        purposePattern: /I am keeping this because.*(webhook|job|background)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/design', '#skill/distributed-systems'],
        forbiddenTags: ['#webhooks', '#jobs'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Background Jobs]]', '[[Job Orchestration]]'],
        isSynthesis: true,
        synthesisIndicators: ['security', 'idempotency', 'orchestration'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      documentType: 'api-design',
      themes: ['webhooks', 'async', 'architecture'],
    },
  },

  // ==========================================================================
  // Debugging Logs (19-24)
  // ==========================================================================
  {
    id: 'tech-019',
    title: 'Debugging: Mobile Keyboard Not Appearing',
    content: `# Bug: Mobile Keyboard Doesn't Appear

## Symptom
On iOS Safari, tapping the editor area does not bring up the keyboard. Works fine on desktop.

## Investigation

### Hypothesis 1: Focus not being set
Added console.log to tap handler - focus() is being called.

### Hypothesis 2: Textarea is hidden
The textarea has opacity: 0. Tried display: block temporarily - keyboard still doesn't appear.

### Hypothesis 3: Programmatic focus blocked
iOS Safari blocks programmatic focus unless it's in direct response to user gesture.

Tested by adding a visible button that calls focus() on click. Keyboard appeared!

## Root Cause
The tap handler was setting focus inside a setTimeout (for debouncing). This breaks the "user gesture" requirement.

## Fix
\`\`\`typescript
// Before (broken)
const handleTap = () => {
  setTimeout(() => {
    textareaRef.current?.focus();
  }, 100);
};

// After (working)
const handleTap = () => {
  textareaRef.current?.focus(); // Immediate, in gesture handler
  setTimeout(() => {
    // Other non-focus stuff
  }, 100);
};
\`\`\`

## Prevention
Added lint rule to warn about focus() inside setTimeout:
\`\`\`javascript
// eslint rule in .eslintrc
"no-restricted-syntax": [
  "warn",
  {
    "selector": "CallExpression[callee.name='setTimeout'] CallExpression[callee.property.name='focus']",
    "message": "focus() inside setTimeout may not work on iOS"
  }
]
\`\`\`

## Time Spent
2 hours. Would have been faster if I'd remembered iOS gesture restrictions.`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['iOS keyboard', 'mobile focus', 'Safari bug'],
        contentMustContain: ['iOS', 'keyboard', 'focus', 'gesture'],
        purposePattern: /I am keeping this because.*(iOS|mobile|keyboard|focus)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/debug'],
        forbiddenTags: ['#mobile', '#ios'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[iOS Safari Quirks]]', '[[Mobile Keyboards]]'],
        isSynthesis: true,
        synthesisIndicators: ['root cause', 'prevention', 'time spent'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      documentType: 'debugging',
      themes: ['mobile', 'ios', 'debugging'],
    },
  },
  {
    id: 'tech-020',
    title: 'Debugging: Graph Nodes Flying Off Screen',
    content: `# Bug: Graph Nodes Escape Viewport

## Symptom
Knowledge graph nodes sometimes fly off the visible area, especially when:
- Graph first loads
- User drags a node and releases
- Window is resized

## Investigation

### Checking Force Parameters
Logged force values - they look reasonable.

### Checking Boundary Constraints
Added boundary force - nodes bounce back but oscillate wildly.

### Reproducing Consistently
Found pattern: happens most when graph has few nodes (< 5) and they're all connected.

### Hypothesis
With few nodes, the center force isn't strong enough to counteract the repulsion force. Nodes push each other to edges, then have nothing pulling them back.

## Root Cause
The forceCenter() only pulls nodes toward center, it doesn't contain them. Combined with strong charge repulsion and few nodes, the system becomes unstable.

## Fix
Added a radial constraint force that increases as nodes move away from center:

\`\`\`typescript
const radiusConstraint = d3.forceRadial(
  (d) => Math.min(d.distanceFromCenter, maxRadius),
  width / 2,
  height / 2
).strength(0.1);

simulation.force('radius', radiusConstraint);
\`\`\`

Also added hard boundary clamping in tick handler:
\`\`\`typescript
simulation.on('tick', () => {
  nodes.forEach(node => {
    node.x = Math.max(margin, Math.min(width - margin, node.x));
    node.y = Math.max(margin, Math.min(height - margin, node.y));
  });
});
\`\`\`

## Lessons Learned
1. Force-directed layouts need boundary constraints for edge cases
2. Test with minimal data, not just large datasets
3. Physics simulations can be unstable - always add damping

## Time Spent
4 hours over 2 days. Got stuck on the boundary force not working until I realized I needed both soft (radial) and hard (clamping) constraints.`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['graph stability', 'force layout', 'boundary constraints'],
        contentMustContain: ['graph', 'force', 'boundary', 'constraint'],
        purposePattern: /I am keeping this because.*(graph|force|stability)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/debug'],
        forbiddenTags: ['#graph', '#d3'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Force-Directed Graphs]]', '[[D3.js]]'],
        isSynthesis: true,
        synthesisIndicators: ['root cause', 'lessons learned', 'fix'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      documentType: 'debugging',
      themes: ['visualization', 'd3', 'debugging'],
    },
  },
  {
    id: 'tech-021',
    title: 'Debugging: Extraction Timeout on Long Documents',
    content: `# Bug: Extraction Times Out on Long Documents

## Symptom
Documents over ~5000 words fail extraction with timeout error. Shorter documents work fine.

## Investigation

### Checking Edge Function Logs
Function starts, calls Claude API, then... nothing. Timeout after 60 seconds.

### Testing Claude API Directly
Called Claude API with same prompt from local machine. Response takes 90 seconds for long docs.

### Hypothesis
Claude is processing but Edge Function times out before response arrives.

## Root Cause
Two issues:
1. Edge Function default timeout is 60s, Claude needs 90s+ for long docs
2. We were sending entire document in one prompt, not chunking

## Fix

### 1. Increase Timeout
\`\`\`typescript
// supabase/functions/extract/index.ts
Deno.serve({
  handler: async (req) => { ... },
  timeout: 120 // 2 minutes
});
\`\`\`

### 2. Chunk Long Documents
Split documents into ~2000 word chunks, process in parallel, merge results:

\`\`\`typescript
function chunkDocument(content: string, maxWords = 2000): string[] {
  const words = content.split(/\\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(' '));
  }
  return chunks;
}

async function extractFromChunks(chunks: string[]) {
  const results = await Promise.all(
    chunks.map(chunk => extractFromChunk(chunk))
  );
  return mergeExtractionResults(results);
}
\`\`\`

### 3. Add Progress Updates
For user feedback, update job status after each chunk:
\`\`\`typescript
for (let i = 0; i < chunks.length; i++) {
  await updateJobProgress(jobId, i / chunks.length);
  results.push(await extractFromChunk(chunks[i]));
}
\`\`\`

## Results
- 5000 word doc: 90s → 45s (parallel chunks)
- 10000 word doc: timeout → 80s
- User sees progress, doesn't think app is frozen

## Time Spent
6 hours. Most time spent on merging results correctly (deduplicating notes that appeared in adjacent chunks).`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['extraction timeout', 'chunking', 'Edge Function timeout'],
        contentMustContain: ['timeout', 'chunks', 'parallel', 'extraction'],
        purposePattern: /I am keeping this because.*(timeout|chunking|long documents)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/debug'],
        forbiddenTags: ['#timeout', '#extraction'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Edge Functions]]', '[[Parallel Processing]]'],
        isSynthesis: true,
        synthesisIndicators: ['root cause', 'fix', 'results'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      documentType: 'debugging',
      themes: ['performance', 'ai', 'edge-functions'],
    },
  },
  {
    id: 'tech-022',
    title: 'Debugging: Double Scrollbar Issue',
    content: `# Bug: Two Scrollbars in Editor

## Symptom
Editor shows two vertical scrollbars - one for the page, one for the editor container. Looks broken and causes scroll jank.

## Investigation

### CSS Inspection
Both body and .editor-container have overflow: auto.

### Removing overflow: auto from body
Scrollbar goes away but page content is clipped.

### Checking Component Hierarchy
\`\`\`
<body>
  <main class="h-screen overflow-auto">
    <div class="editor-container h-full overflow-auto">
      <textarea>...
\`\`\`

Two nested scrollable containers!

## Root Cause
Both the page layout and the editor were trying to be the scroll container. This is a common issue with "full-height" editor layouts.

## Fix
Make editor the only scroll container. Page layout should size to fit without scrolling:

\`\`\`css
/* Before */
main { height: 100vh; overflow: auto; }
.editor-container { height: 100%; overflow: auto; }

/* After */
main { height: 100vh; overflow: hidden; }
.editor-container {
  height: calc(100vh - var(--header-height));
  overflow-y: auto;
  overflow-x: hidden;
}
\`\`\`

Key changes:
1. Parent has \`overflow: hidden\` (no scrolling)
2. Editor has explicit height (not 100% which inherits)
3. Only editor has overflow: auto

## Prevention
Added this comment to CSS:
\`\`\`css
/*
 * SCROLL CONTAINER: Only this element should have overflow: auto
 * Do not add overflow: auto to parent elements or you'll get double scrollbars
 */
\`\`\`

## Related
This pattern applies anywhere we have a "fill remaining space" layout. The scroll container should be the innermost component that needs scrolling.

## Time Spent
30 minutes. Quick once I inspected the element hierarchy.`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['double scrollbar', 'overflow CSS', 'scroll container'],
        contentMustContain: ['scrollbar', 'overflow', 'scroll', 'container'],
        purposePattern: /I am keeping this because.*(scroll|overflow|layout)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#skill/css'],
        forbiddenTags: ['#css', '#scroll'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[CSS Overflow]]', '[[Layout Patterns]]'],
        isSynthesis: true,
        synthesisIndicators: ['root cause', 'prevention', 'related'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'simple',
      documentType: 'debugging',
      themes: ['css', 'layout', 'ux'],
    },
  },
  {
    id: 'tech-023',
    title: 'Debugging: Coaching Session Not Loading History',
    content: `# Bug: Coaching History Shows Empty

## Symptom
User clicks "Coaching" on a goal card. Modal opens but shows empty chat, even though messages exist in database.

## Investigation

### Checking Database
\`\`\`sql
SELECT * FROM coaching_messages
WHERE session_id = 'xxx'
ORDER BY created_at;
-- Returns 12 messages. Data exists.
\`\`\`

### Checking API Response
Network tab shows /api/coaching/[id] returns empty array.

### Checking API Code
\`\`\`typescript
const { data } = await supabase
  .from('coaching_messages')
  .select('*')
  .eq('session_id', sessionId)
  .order('created_at');
\`\`\`

Query looks correct...

### Checking RLS Policies
\`\`\`sql
SELECT * FROM pg_policies WHERE tablename = 'coaching_messages';
\`\`\`

Policy exists for SELECT. Let me check if user_id matches.

### Found It!
The coaching_messages table has user_id, and the session was created by a different user than who's currently logged in.

Wait, that shouldn't happen in production. Checking further...

The session was created during E2E testing with test user, but I'm logged in with my dev account.

## Root Cause
Not actually a bug! RLS is working correctly. The empty result was because I was testing with wrong user.

## Lesson Learned
Before debugging "missing data":
1. Verify data exists for current user
2. Check if RLS is filtering correctly
3. Don't assume test data is for your account

## Follow-up
Added a debug endpoint (dev only) to check RLS filtering:
\`\`\`typescript
// /api/debug/rls-check
if (process.env.NODE_ENV !== 'development') {
  return new Response('Not found', { status: 404 });
}
// Compare query with and without RLS bypass
\`\`\`

## Time Spent
45 minutes. Most spent assuming there was a real bug instead of checking auth context first.`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['RLS debugging', 'empty query results', 'auth context'],
        contentMustContain: ['RLS', 'user_id', 'auth', 'query'],
        purposePattern: /I am keeping this because.*(RLS|auth|debugging)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Seed' as NoteStatus,
        expectedType: 'Reflection' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/debug'],
        forbiddenTags: ['#debugging', '#rls'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Row Level Security]]', '[[Debugging Process]]'],
        isSynthesis: true,
        synthesisIndicators: ['lesson learned', 'not actually a bug', 'follow-up'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'simple',
      documentType: 'debugging',
      themes: ['debugging', 'rls', 'testing'],
    },
  },
  {
    id: 'tech-024',
    title: 'Debugging: Goal Coach Showing Raw JSON Errors',
    content: `# Bug: JSON Error Message Shown to Users

## Symptom
When Claude API fails, users see:
\`\`\`
{"type":"error","error":{"type":"rate_limit_error","message":"Rate limited"}}
\`\`\`

This is raw JSON, not a friendly error message.

## Investigation

### Finding Error Source
The streaming response handler:
\`\`\`typescript
const reader = response.body?.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  setMessage(prev => prev + text);
}
\`\`\`

If server returns error, it's still text - gets appended to message!

### Checking Server-Side
\`\`\`typescript
const stream = await anthropic.messages.stream(...);
return new Response(stream.toReadableStream());
\`\`\`

If Anthropic throws, we're not catching it. Error propagates as JSON.

## Root Cause
Two issues:
1. Server doesn't catch Anthropic API errors
2. Client doesn't check if response is error before appending

## Fix

### Server-Side
\`\`\`typescript
try {
  const stream = await anthropic.messages.stream(...);
  return new Response(stream.toReadableStream(), {
    headers: { 'Content-Type': 'text/event-stream' }
  });
} catch (error) {
  const message = getUserFriendlyError(error);
  return new Response(JSON.stringify({ error: message }), {
    status: error.status || 500,
    headers: { 'Content-Type': 'application/json' }
  });
}

function getUserFriendlyError(error: unknown): string {
  if (error.type === 'rate_limit_error') {
    return "I'm getting a lot of requests right now. Please wait a moment and try again.";
  }
  // ... other cases
  return "Something went wrong. Please try again.";
}
\`\`\`

### Client-Side
\`\`\`typescript
if (!response.ok) {
  const { error } = await response.json();
  setErrorMessage(error);
  return;
}
// Only stream if response is ok
\`\`\`

## Prevention
Added integration test that mocks Anthropic failure and verifies friendly message is shown.

## Time Spent
1 hour. Fix was straightforward once I traced the error path.`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['error handling', 'user-friendly errors', 'API error'],
        contentMustContain: ['error', 'user-friendly', 'JSON', 'catch'],
        purposePattern: /I am keeping this because.*(error handling|user experience)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Future Users' as Stakeholder,
        expectedFunctionalTags: ['#insight/core', '#task/debug'],
        forbiddenTags: ['#errors', '#api'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Error Handling]]', '[[User Experience]]'],
        isSynthesis: true,
        synthesisIndicators: ['root cause', 'prevention', 'fix'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      documentType: 'debugging',
      themes: ['error-handling', 'ux', 'api'],
    },
  },

  // ==========================================================================
  // Learning Notes (25-30)
  // ==========================================================================
  {
    id: 'tech-025',
    title: 'Learning: Deno vs Node for Edge Functions',
    content: `# Deno in Supabase Edge Functions

## Why Deno?
Supabase chose Deno for Edge Functions because:
1. **Security by default**: No file/network access without explicit permission
2. **TypeScript native**: No build step needed
3. **Web standards**: fetch, Request, Response work out of the box
4. **Fast cold starts**: V8 isolates are lighter than containers

## Key Differences from Node

### 1. Import Syntax
\`\`\`typescript
// Node
const { createClient } = require('@supabase/supabase-js');

// Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
\`\`\`

Deno uses URLs for imports. esm.sh converts npm packages to ESM.

### 2. Environment Variables
\`\`\`typescript
// Node
process.env.API_KEY

// Deno
Deno.env.get('API_KEY')
\`\`\`

### 3. File Operations
\`\`\`typescript
// Node
const fs = require('fs');
fs.readFileSync('file.txt');

// Deno
await Deno.readTextFile('file.txt');
// Requires --allow-read flag
\`\`\`

### 4. HTTP Server
\`\`\`typescript
// Node (Express)
app.get('/api', (req, res) => res.send('hello'));

// Deno (native)
Deno.serve((req) => new Response('hello'));
\`\`\`

## What Caught Me Off Guard

### npm package compatibility
Not all npm packages work. Had to find Deno-compatible alternatives:
- ✅ @supabase/supabase-js (works via esm.sh)
- ✅ @anthropic-ai/sdk (works)
- ❌ Some packages with native bindings (need Deno-specific versions)

### No node_modules
Dependencies are cached globally, not in project. Can't easily inspect what's installed.

### Top-level await
Works everywhere in Deno - no need to wrap in async IIFE.

## My Takeaways
1. Deno is more "correct" (web standards) but less familiar
2. Edge Function constraints (no file system, limited memory) matter more than Deno vs Node
3. Most Claude API code works unchanged between Node and Deno`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['Deno', 'Edge Functions', 'Deno vs Node'],
        contentMustContain: ['Deno', 'Node', 'Edge Functions', 'differences'],
        purposePattern: /I am keeping this because.*(Deno|Edge Functions|learning)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/learn', '#skill/deno'],
        forbiddenTags: ['#deno', '#node'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Deno Runtime]]', '[[Edge Functions]]'],
        isSynthesis: true,
        synthesisIndicators: ['why Deno', 'caught me off guard', 'my takeaways'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      documentType: 'learning-note',
      themes: ['deno', 'runtime', 'learning'],
    },
  },
  {
    id: 'tech-026',
    title: 'Learning: React Server Components Mental Model',
    content: `# Understanding React Server Components

## The Key Insight
RSC splits React into two parts:
1. **Server Components**: Render on server, send HTML to client
2. **Client Components**: Render on client, are interactive

The "server" in RSC isn't just SSR. It's components that NEVER run on client.

## When to Use Each

### Server Components (default in Next.js 13+)
- Fetching data
- Accessing backend resources directly
- Keeping large dependencies server-only
- No interactivity needed

\`\`\`tsx
// Server Component - no 'use client' directive
async function NotesList() {
  const notes = await db.query('SELECT * FROM notes');
  return notes.map(note => <NoteCard note={note} />);
}
\`\`\`

### Client Components
- Event handlers (onClick, onChange)
- useState, useEffect
- Browser APIs (localStorage, window)
- Third-party libs that use client state

\`\`\`tsx
'use client'
function NoteEditor({ note }) {
  const [content, setContent] = useState(note.content);
  return <textarea onChange={e => setContent(e.target.value)} />;
}
\`\`\`

## The Composition Rule
Server Components can import Client Components.
Client Components CANNOT import Server Components.

This means the tree flows: Server → Client → (no going back)

\`\`\`tsx
// ✅ Works
// ServerLayout.tsx (server)
import ClientButton from './ClientButton';

// ❌ Doesn't work
// ClientButton.tsx (client)
import ServerData from './ServerData'; // Error!
\`\`\`

## Workaround: Children Pattern
Pass Server Component as children to Client Component:

\`\`\`tsx
// ServerPage.tsx
<ClientDrawer>
  <ServerContent /> {/* This works! */}
</ClientDrawer>
\`\`\`

## What I Got Wrong Initially
1. Thought 'use client' meant "only runs on client" - wrong, it also runs on server for SSR
2. Tried to use useState in Server Components - you can't
3. Forgot that Server Components can be async - they can!

## My Mental Model Now
Think of it as: "Where does this component's logic need to run?"
- Logic needs user interaction → Client
- Logic needs secrets/database → Server
- Logic is pure rendering → Either, prefer Server`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['React Server Components', 'RSC', 'server vs client'],
        contentMustContain: ['Server Component', 'Client Component', 'use client'],
        purposePattern: /I am keeping this because.*(RSC|server component|mental model)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/learn', '#skill/react'],
        forbiddenTags: ['#react', '#nextjs'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[React Server Components]]', '[[Next.js App Router]]'],
        isSynthesis: true,
        synthesisIndicators: ['key insight', 'what I got wrong', 'my mental model'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      documentType: 'learning-note',
      themes: ['react', 'nextjs', 'architecture'],
    },
  },
  {
    id: 'tech-027',
    title: 'Learning: PostgreSQL Text Search',
    content: `# Full-Text Search in PostgreSQL

## Why Not Just LIKE?
\`\`\`sql
SELECT * FROM notes WHERE content LIKE '%search term%';
\`\`\`

Problems:
- No index usage (full table scan)
- Case sensitive
- No word stemming ('running' won't match 'run')
- No ranking by relevance

## PostgreSQL FTS Basics

### 1. Text Search Vectors
\`\`\`sql
SELECT to_tsvector('english', 'The quick brown fox jumps');
-- 'brown':3 'fox':4 'jump':5 'quick':2
\`\`\`

Words are stemmed ('jumps' → 'jump') and stop words removed ('the').

### 2. Text Search Queries
\`\`\`sql
SELECT to_tsquery('english', 'quick & fox');
-- 'quick' & 'fox'
\`\`\`

### 3. Matching
\`\`\`sql
SELECT * FROM notes
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'quick & fox');
\`\`\`

## Adding Index for Performance

\`\`\`sql
-- Option 1: GIN index (smaller, slower updates)
CREATE INDEX notes_search_idx ON notes
USING GIN (to_tsvector('english', content));

-- Option 2: GiST index (faster for wildcard)
CREATE INDEX notes_search_idx ON notes
USING GiST (to_tsvector('english', content));
\`\`\`

## Ranking Results
\`\`\`sql
SELECT title,
       ts_rank(to_tsvector('english', content), query) AS rank
FROM notes, to_tsquery('english', 'knowledge & graph') query
WHERE to_tsvector('english', content) @@ query
ORDER BY rank DESC;
\`\`\`

## What I Learned

### Generated Columns for Performance
Instead of computing tsvector every query:
\`\`\`sql
ALTER TABLE notes
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))) STORED;

CREATE INDEX ON notes USING GIN (search_vector);
\`\`\`

### Phrase Search
For exact phrases, use <-> (followed by):
\`\`\`sql
WHERE search_vector @@ to_tsquery('english', 'knowledge <-> graph');
-- Matches "knowledge graph" but not "knowledge and graph"
\`\`\`

### Prefix Matching
For autocomplete:
\`\`\`sql
WHERE search_vector @@ to_tsquery('english', 'know:*');
-- Matches knowledge, knowing, known, etc.
\`\`\`

## Gotchas
1. Different languages need different configs ('english', 'spanish', etc.)
2. tsvector columns need triggers to stay updated (or use generated columns)
3. Very short queries (1-2 chars) aren't handled well`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['PostgreSQL text search', 'full-text search', 'tsvector'],
        contentMustContain: ['text search', 'tsvector', 'tsquery', 'index'],
        purposePattern: /I am keeping this because.*(search|PostgreSQL|full-text)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/learn', '#skill/databases'],
        forbiddenTags: ['#postgresql', '#search'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[PostgreSQL]]', '[[Full-Text Search]]'],
        isSynthesis: true,
        synthesisIndicators: ['why not just LIKE', 'what I learned', 'gotchas'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      documentType: 'learning-note',
      themes: ['postgresql', 'search', 'databases'],
    },
  },
  {
    id: 'tech-028',
    title: 'Learning: Claude API Streaming Patterns',
    content: `# Claude API Streaming Deep Dive

## Why Stream?
Claude can take 10-30 seconds for long responses. Without streaming, users stare at a spinner. With streaming, they see words appear immediately.

## Basic Streaming
\`\`\`typescript
const stream = await anthropic.messages.stream({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1000,
  messages: [{ role: 'user', content: 'Tell me a story' }]
});

for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    process.stdout.write(event.delta.text);
  }
}
\`\`\`

## Event Types

### content_block_start
First event for a new content block. Contains block type.

### content_block_delta
Incremental text. Most events are this type.
\`\`\`json
{
  "type": "content_block_delta",
  "delta": { "type": "text_delta", "text": " word" }
}
\`\`\`

### content_block_stop
Content block is complete.

### message_stop
Entire message is complete.

## Handling Tool Use in Streams
When Claude wants to call a tool mid-stream:
1. content_block_stop for text
2. content_block_start for tool_use
3. content_block_delta with tool input
4. content_block_stop for tool

\`\`\`typescript
let currentBlock = null;
for await (const event of stream) {
  switch (event.type) {
    case 'content_block_start':
      currentBlock = { type: event.content_block.type };
      break;
    case 'content_block_delta':
      if (currentBlock.type === 'text') {
        handleText(event.delta.text);
      } else if (currentBlock.type === 'tool_use') {
        handleToolDelta(event.delta);
      }
      break;
  }
}
\`\`\`

## Converting Stream to Web Response

For Next.js API routes:
\`\`\`typescript
export async function POST(req: Request) {
  const stream = await anthropic.messages.stream({...});

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === 'content_block_delta') {
            controller.enqueue(
              new TextEncoder().encode(event.delta.text)
            );
          }
        }
        controller.close();
      }
    }),
    { headers: { 'Content-Type': 'text/plain' } }
  );
}
\`\`\`

## Lessons Learned

### Buffer for Smooth Display
Raw events can be jerky (single chars). Buffer to word boundaries:
\`\`\`typescript
let buffer = '';
function processChunk(text: string) {
  buffer += text;
  const match = buffer.match(/^(.*\\s)/);
  if (match) {
    display(match[1]);
    buffer = buffer.slice(match[1].length);
  }
}
\`\`\`

### Handle Disconnection
User might close tab mid-stream. Always handle AbortSignal:
\`\`\`typescript
const controller = new AbortController();
req.signal.addEventListener('abort', () => controller.abort());
const stream = await anthropic.messages.stream({
  ...options,
  signal: controller.signal
});
\`\`\``,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['Claude streaming', 'API streaming', 'streaming patterns'],
        contentMustContain: ['streaming', 'Claude', 'events', 'ReadableStream'],
        purposePattern: /I am keeping this because.*(streaming|Claude|real-time)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/learn', '#skill/ai'],
        forbiddenTags: ['#streaming', '#claude'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Claude API]]', '[[Streaming Responses]]'],
        isSynthesis: true,
        synthesisIndicators: ['why stream', 'lessons learned', 'event types'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      documentType: 'learning-note',
      themes: ['ai', 'streaming', 'api'],
    },
  },
  {
    id: 'tech-029',
    title: 'Learning: CSS Container Queries',
    content: `# Container Queries for Component-Based Design

## The Problem with Media Queries
Media queries check viewport width, but components don't know their container's width:

\`\`\`css
/* This checks viewport, not component container */
@media (max-width: 600px) {
  .card { flex-direction: column; }
}
\`\`\`

A card in a sidebar should be "mobile" layout even on a 1920px screen.

## Container Queries Solution

### 1. Define a Container
\`\`\`css
.sidebar {
  container-type: inline-size;
  container-name: sidebar;
}
\`\`\`

### 2. Query the Container
\`\`\`css
@container sidebar (max-width: 300px) {
  .card { flex-direction: column; }
}
\`\`\`

Now the card responds to sidebar width, not viewport.

## Browser Support
As of 2024: Chrome, Firefox, Safari all support container queries.
Fallback not needed for modern apps.

## Use Cases in Writing UI

### Note Cards in Different Contexts
\`\`\`css
/* Full page: horizontal card */
.note-card {
  display: flex;
  flex-direction: row;
}

/* In graph panel: vertical card */
@container (max-width: 250px) {
  .note-card {
    flex-direction: column;
  }
}
\`\`\`

### Goal Cards
\`\`\`css
.goals-container {
  container-type: inline-size;
}

/* Full width: show all info */
.goal-card { /* default layout */ }

/* Narrow: hide secondary info */
@container (max-width: 400px) {
  .goal-card .secondary-info { display: none; }
}
\`\`\`

## Gotchas

### Container must have size containment
\`\`\`css
/* This breaks layout */
.container {
  container-type: inline-size;
  height: auto; /* ❌ height can't depend on children */
}
\`\`\`

Container can't size based on children for inline-size containment.

### Descendant queries only
Can only query ancestor containers, not siblings or parents.

## My Takeaway
Container queries finally make truly responsive components possible. Media queries are for page-level layout; container queries are for component-level layout.`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['container queries', 'CSS container queries', 'responsive components'],
        contentMustContain: ['container', 'query', 'responsive', 'media query'],
        purposePattern: /I am keeping this because.*(container|responsive|component)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/learn', '#skill/css'],
        forbiddenTags: ['#css', '#responsive'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Container Queries]]', '[[Responsive Design]]'],
        isSynthesis: true,
        synthesisIndicators: ['the problem', 'gotchas', 'my takeaway'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'moderate',
      documentType: 'learning-note',
      themes: ['css', 'responsive', 'components'],
    },
  },
  {
    id: 'tech-030',
    title: 'Learning: Prompt Engineering for Extraction',
    content: `# Prompt Engineering for Knowledge Extraction

## The Challenge
Turn freeform writing into structured atomic notes. The AI needs to:
1. Identify distinct ideas
2. Separate facts from opinions
3. Create meaningful connections
4. Generate good titles

## Prompt Evolution

### Version 1: Simple (Poor Results)
\`\`\`
Extract atomic notes from this text:
{content}
\`\`\`

Problems: Too many notes, no consistency, poor titles.

### Version 2: Structured (Better)
\`\`\`
You are a knowledge management expert. Extract atomic notes from the following text.

For each note:
- Title: A clear, specific title (not generic)
- Content: The core insight in 2-3 sentences
- Tags: 1-3 relevant tags

Rules:
- Each note should be one atomic idea
- Notes should be useful in isolation
- Avoid duplicate or overlapping notes

Text:
{content}
\`\`\`

Better but still had issues with note scope (too broad or too narrow).

### Version 3: Examples + Guidelines (Good)
\`\`\`
Extract atomic notes following the Zettelkasten method.

GOOD atomic note example:
- Title: "Spaced repetition works by exploiting forgetting"
- Content: "We remember best when we retrieve information just as we're about to forget it. Spaced repetition systems optimize review timing to hit this sweet spot, making learning dramatically more efficient."

BAD atomic note (too broad):
- Title: "Learning techniques"
- Content: "There are many ways to learn including spaced repetition, active recall, and interleaving..."

Guidelines:
- One clear idea per note
- Title should be a claim or insight, not a topic
- Content explains the "why" not just the "what"
- If you're unsure whether to split, split

Now extract notes from:
{content}
\`\`\`

### Version 4: Current (With Schema)
Added JSON schema for consistent output:
\`\`\`
Return a JSON array where each note has:
{
  "title": string, // Specific claim or insight
  "content": string, // 2-4 sentences explaining the idea
  "tags": string[], // 1-3 functional tags like #task/implement
  "connections": [{ "title": string, "type": string }]
}
\`\`\`

## Key Learnings

### Show don't tell
Good/bad examples work better than rules.

### Specificity over length
Short prompts with specific examples beat long prompts with vague instructions.

### Schema forces consistency
Structured output (JSON) eliminates formatting issues.

### Temperature matters
- 0.3-0.5 for extraction (consistent, factual)
- 0.7-0.9 for creative prompts (varied, surprising)

## Metrics That Improved
- Notes per document: 15 → 5 (more focused)
- Unique titles: 40% → 90%
- Cross-document connections: 5% → 30%`,
    sourceType: 'technical',
    expectedNotes: [
      {
        titlePatterns: ['prompt engineering', 'extraction prompts', 'AI extraction'],
        contentMustContain: ['prompt', 'extraction', 'examples', 'schema'],
        purposePattern: /I am keeping this because.*(prompt|extraction|AI)/i,
        expectedProject: 'Writing UI',
        expectedStatus: 'Sapling' as NoteStatus,
        expectedType: 'Technical' as NoteType,
        expectedStakeholder: 'Self' as Stakeholder,
        expectedFunctionalTags: ['#task/learn', '#skill/prompt-engineering'],
        forbiddenTags: ['#prompts', '#ai'],
        expectedUpwardLink: '[[Project/Writing UI]]',
        expectedSidewaysLinks: ['[[Prompt Engineering]]', '[[Knowledge Extraction]]'],
        isSynthesis: true,
        synthesisIndicators: ['prompt evolution', 'key learnings', 'metrics improved'],
      },
    ],
    metadata: {
      projectContext: 'Writing UI',
      complexity: 'complex',
      documentType: 'learning-note',
      themes: ['ai', 'prompt-engineering', 'extraction'],
    },
  },
]

/**
 * Get all technical documents
 */
export function getAllTechnicalDocuments(): TechnicalDocumentFixture[] {
  return TECHNICAL_DOCUMENTS
}

/**
 * Get documents by type
 */
export function getDocumentsByType(
  type: TechnicalDocumentFixture['metadata']['documentType']
): TechnicalDocumentFixture[] {
  return TECHNICAL_DOCUMENTS.filter((d) => d.metadata.documentType === type)
}

/**
 * Get documents by complexity
 */
export function getDocumentsByComplexity(complexity: 'simple' | 'moderate' | 'complex'): TechnicalDocumentFixture[] {
  return TECHNICAL_DOCUMENTS.filter((d) => d.metadata.complexity === complexity)
}

/**
 * Get documents by theme
 */
export function getDocumentsByTheme(theme: string): TechnicalDocumentFixture[] {
  return TECHNICAL_DOCUMENTS.filter((d) => d.metadata.themes.includes(theme))
}
