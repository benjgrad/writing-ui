# Note Vitality Quotient (NVQ) Scoring

The Note Vitality Quotient is a 10-point scoring system that evaluates the quality of extracted Zettelkasten-style atomic notes. It measures whether notes are genuinely useful for personal knowledge management rather than just raw information dumps.

## Score Breakdown

| Component      | Points | What It Measures                                    |
|----------------|--------|-----------------------------------------------------|
| Why            | 0-3    | Purpose statement, goal connection, actionability   |
| Metadata       | 0-2    | Status, Type, Stakeholder, Project                  |
| Taxonomy       | 0-2    | Functional vs topic tags                            |
| Connectivity   | 0-2    | Upward and sideways links                           |
| Originality    | 0-1    | Synthesis vs raw data                               |
| **Total**      | **10** |                                                     |

**Passing threshold: 7/10**

---

## Component Details

### 1. Why (0-3 points)

The "Why" component ensures notes have a clear purpose statement explaining why this note matters to the person keeping it.

| Criterion                | Points | Detection                                           |
|--------------------------|--------|-----------------------------------------------------|
| First-person statement   | +1     | Contains "I", "my", "me" in purpose/content         |
| Links to personal goal   | +1     | References user's goals or whyRoot                  |
| Is actionable            | +1     | Contains action verbs, next steps, or applications  |

**Example of a good purpose statement:**
> "I am keeping this because it connects my goal of building accessible interfaces to the specific technique of progressive enhancement, which I can apply to the voice input feature."

**Common failures:**
- Missing purpose statement entirely
- Generic purpose ("This is useful information")
- No connection to personal goals or projects

---

### 2. Metadata (0-2 points)

The Metadata component checks for structured fields that help organize and filter notes.

**Required fields (3 of 4 needed for full points):**

| Field       | Valid Values                           | Purpose                              |
|-------------|----------------------------------------|--------------------------------------|
| Status      | Seed, Sapling, Evergreen               | Note maturity level                  |
| Type        | Logic, Technical, Reflection           | Kind of knowledge captured           |
| Stakeholder | Self, Future Users, AI Agent           | Who benefits from this note          |
| Project     | Any project name                       | What project this supports           |

**Scoring:**
- 3-4 fields present: **2 points**
- 2 fields present: **1 point**
- 0-1 fields: **0 points**

---

### 3. Taxonomy (0-2 points)

The Taxonomy component evaluates tag quality, preferring functional tags over topic-only tags.

**Functional tags** describe actions, skills, or note evolution:
- `#task/research`, `#task/implement`, `#task/review`
- `#skill/typescript`, `#skill/accessibility`
- `#evolution/refactored`, `#evolution/merged`
- `#project/writing-ui`

**Topic tags** are single-word category labels:
- `#accessibility`, `#react`, `#testing`

**Scoring:**
- All functional tags (no topic tags): **2 points**
- Mix of functional and topic tags: **1 point**
- Only topic tags: **0 points**
- **Penalty:** -1 point if more than 5 tags (note may need splitting)

---

### 4. Connectivity (0-2 points)

The Connectivity component checks that notes are properly linked into the knowledge graph.

**Link types:**

| Direction  | Target                        | Example                              |
|------------|-------------------------------|--------------------------------------|
| Upward     | MOC or Project                | `[[MOC/Accessibility]]`, `[[Project/Writing UI]]` |
| Sideways   | Related concept               | `[[Progressive Enhancement]]`, `[[ARIA Labels]]` |
| Downward   | Example or instance           | `[[Example: Voice Input Implementation]]` |

**Scoring:**
- Both upward AND sideways link: **2 points**
- Either upward OR sideways link: **1 point**
- No links: **0 points**

---

### 5. Originality (0-1 point)

The Originality component distinguishes personal synthesis from raw information capture.

**Synthesis indicators:**
- Personal interpretation ("I realized...", "This means for me...")
- Novel connections between ideas
- Application to specific context
- Reflection on experience

**Wikipedia-fact indicators:**
- Generic definitions
- Encyclopedic facts without personal context
- Copy-pasted information

**Scoring:**
- Has original insight AND not Wikipedia-style fact: **1 point**
- Otherwise: **0 points**

---

## Aggregate Metrics

When evaluating multiple notes, the system calculates:

| Metric              | Description                                    | Target  |
|---------------------|------------------------------------------------|---------|
| Mean NVQ            | Average score across all notes                 | ≥6.5    |
| Passing Rate        | % of notes scoring 7+                          | ≥70%    |
| Component Failure   | % of notes scoring 0 on each component         | ≤30%    |

---

## Example Scoring

### High-Quality Note (9/10)

```markdown
# Progressive Enhancement for Voice Input

I am keeping this because it solves the core challenge of my accessible
journaling goal: making voice input work even when the Web Speech API fails.

Status: Seed
Type: Technical
Stakeholder: Future Users
Project: Writing UI

The key insight is that voice input should enhance, not replace, the text
interface. Users with motor disabilities need voice as primary input, but
the app should gracefully degrade to touch/click for users in noisy environments.

This connects to [[MOC/Accessibility]] and relates to [[Graceful Degradation]].

#task/implement #skill/accessibility #project/writing-ui
```

**Score breakdown:**
- Why: 3/3 (first person ✓, links to goal ✓, actionable ✓)
- Metadata: 2/2 (Status, Type, Stakeholder, Project = 4 fields)
- Taxonomy: 2/2 (all functional tags)
- Connectivity: 2/2 (upward to MOC ✓, sideways to concept ✓)
- Originality: 0/1 (missing personal synthesis language)

### Low-Quality Note (2/10)

```markdown
# Web Speech API

The Web Speech API provides speech recognition capabilities in web browsers.
It was introduced in 2012 and is supported by Chrome and Safari.

#speech #api #browser
```

**Score breakdown:**
- Why: 0/3 (no purpose statement, no goal link, not actionable)
- Metadata: 0/2 (no status, type, stakeholder, or project)
- Taxonomy: 0/2 (all topic tags)
- Connectivity: 0/2 (no links)
- Originality: 0/1 (Wikipedia-style fact)

---

## Running NVQ Tests

```bash
# Run quality evaluation only
npx tsx tests/extraction-accuracy/runner.ts --quality-only

# Run with verbose output (shows individual note scores)
npx tsx tests/extraction-accuracy/runner.ts --quality-only --verbose

# Run combined extraction + quality tests
npx tsx tests/extraction-accuracy/runner.ts --quality

# CI mode (machine-readable output)
npx tsx tests/extraction-accuracy/runner.ts --quality-only --ci
```

---

## Implementation

The NVQ evaluator is implemented in:
- [evaluator.ts](quality/evaluator.ts) - Main scoring engine
- [patterns.ts](quality/patterns.ts) - Regex patterns for detection
- [types.ts](quality/types.ts) - Type definitions

Configuration thresholds are in [config.ts](config.ts) under the `nvq` key.
