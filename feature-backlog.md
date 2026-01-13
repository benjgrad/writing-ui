# Feature Backlog

This document tracks platform feedback, UX issues, and planned features.

---

## 🔴 Critical / Bugs

### Editor

- **Backspace limitations broken**: Should be possible to backspace past the last two words. Currently blocked incorrectly.
- **Titles of the documents cannot be set**: Users cannot set or edit document titles in the editor. Also the AI is not generating titles.

### Mobile Experience

- ~~**Editor keyboard doesn't appear**: On mobile, the editor doesn't bring up the keyboard at all, making it unusable for writing.~~ **FIXED** - Added hidden textarea for mobile keyboard capture.
- **Coaching chat keyboard pushes content offscreen**: When the mobile keyboard appears in the Goal Coach chat, it pushes the chat content off the screen instead of adjusting the viewport properly.
- **Editor has no visible writing area**: On mobile, the editor shows only a gradient background with no cursor, placeholder, or visual affordance indicating where to type. Users have no idea they can write.
- **Raw API errors shown to users**: Goal Coach displays raw JSON error messages (e.g., `{"type":"error"...}`) instead of user-friendly error messages.

### API Errors

- **400 error on /api/ai/prompt**: Editor throws 400 Bad Request when loading AI prompts.

---

## 🟡 High Priority / UX Issues

### Design System

- **Inconsistent dark mode**: Dashboard uses dark theme, Goals page uses light theme, Editor has gradient. Need unified color system across all pages.
- **Inconsistent navigation**: Dashboard has horizontal nav, Goals page has different header layout, Editor/Graph have back arrows. Need unified nav pattern.

### Mobile UX

- **Unexplained "1 Issue" badge**: Editor shows a red "1 Issue ×" badge at bottom left with no explanation of what the issue is.
- **Goal card touch targets too small**: Action buttons (Coaching, Notes, Add step, Park, Archive) appear under 44px and are hard to tap on mobile.
- **Goal card edit icon too small**: Pencil icon for editing goal is very small and hard to tap.

### Goals / Momentum Engine

- **Goals not visible on dashboard**: User goals should be prominently displayed on the dashboard page, not hidden in separate Goals page.
- **"Failed to fetch goals" error still showing**: Error banner visible even when the page loads successfully.

### Goal Coach UX

- ~~**Goal title shows marker text**: Goal summary card displays `<goal title: ...>` with angle brackets instead of clean title.~~ **FIXED** - Parsing now strips angle bracket markers.
- ~~**Can't load coaching history**: Unable to view past coaching conversations or continue a session from a goal card. The "Coaching" button fails to load the session transcript.~~ **FIXED** - Added useEffect to sync state when existingSession prop changes.
- ~~**Goal editing textarea doesn't auto-grow**: The goal description/notes input field should expand like the chat input does (auto-expanding textarea).~~ **FIXED** - Changed to textarea with auto-grow.
- ~~**Can't continue coaching conversation**: Sessions were view-only, couldn't update goals/motivations through coaching.~~ **FIXED** - Removed viewOnly mode, renamed to "Continue Coaching"
- ~~**Why badge truncation**: "Why" motivation text was cut off too short at 50 chars.~~ **FIXED** - Expanded to 80 chars + click to expand full text.
- ~~**No notes/planning section**: Goals needed a place for medium-long term plans.~~ **FIXED** - Added expandable notes section with auto-save.

### Goal Steps (Micro-Wins)

- **Can't view existing steps**: No way to see all the micro-wins/steps for a goal. Only the current step is visible.
- **Can't edit existing steps**: Users cannot edit or delete existing micro-wins from the UI.
- **Can't manage steps via AI coaching**: The coaching continuation should allow viewing, editing, and reorganizing all steps, not just adding new ones.

---

## 🟢 Medium Priority / Enhancements

### Knowledge Extraction

- **No zettelkasten-style atomic notes**: Platform should extract atomic insights/notes from:
  - Writing content
  - Goal coaching chat transcripts
  - This would feed the Knowledge Graph with user-generated wisdom

### Goals Enhancement

- **Goal context and notes**: Ability to add additional context, reflections, or notes to existing goals.
- **Goal progress tracking**: Track micro-win completions and goal progress over time.

### Editor Improvements

- **Session duration tracking**: Show how long the user has been writing.
- **Export functionality**: Allow exporting writing sessions to markdown/PDF.
- **Auto-save triggers too frequently**: Console shows auto-save triggered on every keystroke - should debounce.

### Knowledge Graph

- **Empty state guidance**: Graph page needs better onboarding for new users with no notes.
- **Search improvements**: Full-text search within note content.

---

## 🔵 Low Priority / Nice-to-Have

### Polish

- **Loading states**: Add skeleton UI while waiting for AI responses in Goal Coach.
- **Completion check console spam**: Debounce `[GoalCoach] Completion check` logs - fires multiple times.
- **Input autocomplete attributes**: Browser console warns about missing autocomplete on login/signup forms.

### Performance

- **AI response time tracking**: Monitor and optimize Claude API response times.
- **A/B test coach prompts**: Experiment with different coaching personalities.

---

## ✅ Completed

- [x] Goal Coach conversation flow (6 stages working)
- [x] Progressive goal summary card (builds as data is captured)
- [x] Visual progress indicator (5-segment bar)
- [x] Auto-save in editor
- [x] Word fading mechanism
- [x] Basic Knowledge Graph visualization
- [x] Authentication flow (login/signup)
- [x] Autonomous AI testing infrastructure
- [x] Test user created in Supabase (test@example.com)
- [x] Goal coaching chat history saved to database (`coaching_sessions` + `coaching_messages` tables)
- [x] View past coaching transcript from goal card ("Coaching" button)
- [x] Chat input grows with text (auto-expanding textarea like ChatGPT)
- [x] Goal title marker text stripped from display (parsing fix)
- [x] Coaching history loading fixed (useEffect sync for existingSession prop)
- [x] Continue coaching conversations (not just view-only history)
- [x] Why badge expanded to 80 chars with click-to-expand
- [x] Notes section for medium-long term plans per goal (auto-saves on blur)
- [x] Goal editing uses textareas with auto-grow
- [x] Continue coaching conversation to update goal, motivation, or next steps
- [x] Visual indicator in chat when goal is updated via coaching
- [x] Goal card refreshes automatically after coaching updates

---

## UX Review Observations (Jan 8, 2026)

### Screenshots Captured

Full test session with authenticated user in `tests/ux-review/platform-review-2026-01-08T02-08-50/`:

- Dashboard (dark theme)
- Goals page with Goal Coach modal (light theme)
- Editor with gradient background
- Knowledge Graph (empty state)
- Mobile responsive view

### What's Working Well

1. **Goal Coach UX**: Smooth animations, clear stage labels, progress indicator
2. **Progressive disclosure**: Goal summary card builds as conversation progresses
3. **Editor concept**: Dreamlike gradient writing experience is unique
4. **Responsive design**: Mobile layout works well on Goals page
5. **Navigation**: Clear paths between Dashboard, Goals, Graph, Editor

### Key Issues Identified

1. **Color scheme inconsistency**: Dark dashboard vs light goals page vs gradient editor
2. **Chat input UX**: Single-line input should grow to accommodate long responses
3. **Backspace bug**: Can't delete beyond last two words
4. **Error banners**: Show even when things work (confusing)
5. **No chat persistence**: Goal coaching conversations lost after creation

### Navigation Structure

```
/login, /signup     → Auth pages
/dashboard          → Document list (DARK theme)
/write/[id]         → DreamEditor (GRADIENT)
/goals              → Momentum Engine (LIGHT theme)
/graph              → Knowledge Graph (LIGHT theme)
```

### ✅ Completed: Save Goal Chat History (Jan 8, 2026)

Implementation:

- Created `coaching_sessions` and `coaching_messages` tables with RLS policies
- Sessions linked to goals via `goal_id`
- "Coaching" button on goal cards opens transcript viewer
- Chat textarea auto-grows like ChatGPT
- Continue coaching is partially supported (session can be resumed with history)

### ✅ Completed: Fix Goal Title Marker Text (Jan 8, 2026)

Fixed parsing to strip angle bracket markers from goal title, why, and micro-win extraction.

### ✅ Improved: AI Agent Testing (Jan 8, 2026)

Enhanced the autonomous AI test agent to:

- Actually read and understand coach questions (not mechanical stage-based responses)
- Respond naturally to the conversation context
- Provide a realistic "user experience" test of the coaching flow

Sample test conversation (AI-generated responses):

- Coach: "What goal would you like to focus on?"
- User: "I'd like to work on getting better at public speaking..."
- Coach: "Why does improving your public speaking matter to you?"
- User: "It would mean a lot for my career - I feel like I'm not being taken as seriously..."
- Coach: "What small first step could you take this week?"
- User: "I could practice my opening lines in front of a mirror each morning..."

The coaching prompts are now conversational and ask clear questions that guide users naturally through the goal-setting process.

### Next Priority: Goals on Dashboard

Display user goals prominently on the dashboard page instead of hiding them in the separate Goals page.

---

## Mobile Design Review (Jan 10, 2026)

### Screenshots Captured

Mobile screenshots at 375px viewport (iPhone SE) in `tests/screenshots/mobile/`:

1. `01-editor-empty.png` - Editor initial state
2. `02-editor-with-prompt.png` - Editor waiting for AI prompt
3. `03-editor-tapped.png` - Editor after tap
4. `04-editor-with-text.png` - Editor with typed text
5. `05-dashboard.png` - Dashboard page
6. `06-goals-page.png` - Goals page with goal card
7. `07-coach-modal-open.png` - Goal Coach modal
8. `08-coach-with-response.png` - Coach waiting for AI
9. `09-coach-input-focused.png` - Coach input focused
10. `10-coach-with-typed-response.png` - Coach with user input
11. `11-graph-page.png` - Knowledge Graph empty state

### Critical Issues Found

1. **Editor shows nothing** - No cursor, placeholder, or visual affordance. Users don't know they can type.
2. **Raw JSON errors** - Goal Coach shows `{"type":"error"...}` instead of friendly messages.
3. **"1 Issue" badge unexplained** - Red badge appears with no context.

### High Priority Issues

1. **Theme inconsistency** - Dashboard (light), Goals (light+gradient card), Editor (gradient), Coach (purple header)
2. **Navigation inconsistency** - Different header patterns on each page
3. **Small touch targets** - Goal card action buttons under 44px

### What's Working

1. Goal Coach modal fills screen properly on mobile
2. Chat input is at bottom, positioned well for thumb typing
3. Back navigation arrows are adequate size
4. New Document button is full-width and easy to tap
5. Goal card content is readable

### Recommendations

1. Add placeholder text or cursor to editor ("Tap to start writing...")
2. Implement proper error handling - never show raw JSON
3. Unify navigation across all pages
4. Increase touch targets on goal cards (use menu or larger buttons)
5. Establish consistent color system
