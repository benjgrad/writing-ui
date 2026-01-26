To transform your Zettelkasten from a storage bin into a **generative engine** for your Writing UI project, we need a "Contract of Entry." Every document must sign this contract before it is allowed to exist.

Here is the structured requirement set for every note, designed to kill the collector's fallacy and the orphan trap.

---

## 🏗 The Note Construction Contract

### 1. The "Why" Statement (The Anti-Hoarding Clause)

Every note must begin with a **Purpose Header**. This is one sentence, written in the first person, that justifies the note's existence.

* **Requirement:** It must complete the sentence: *"I am keeping this because..."*
* **Example:** *"I am keeping this because it explains how OpenAI Whisper can handle stuttering, which is vital for my goal of 'inclusive' journaling."*

### 2. The Metadata Block (The "Context Anchor")

Standardized properties that allow for programmatic search and AI-assisted retrieval.

| Field | Requirement | Purpose |
| --- | --- | --- |
| **Project** | Must link to a specific project note (e.g., `[[Writing UI]]`). | Prevents "Floating Facts." |
| **Status** | Must be: `Seed` (Raw info), `Sapling` (Synthesized), or `Evergreen` (A fundamental truth). | Manages the "Obsolescence Lag" of AI info. |
| **Type** | Must be: `Logic` (Why), `Technical` (How), or `Reflection` (Self-observation). | Defines the "vibe" of the information. |
| **Stakeholder** | Who/What is this for? (e.g., `Self`, `Future Users`, `AI Agent`). | Defines the audience for the writing style. |

### 3. The Tagging Taxonomy (The "Functional Tag" Rule)

We avoid "Topic Tags" (e.g., `#AI`). We use **Functional Tags** that describe the note's role in your workflow.

* **Action Tags:** `#task/research`, `#task/implement`, `#decision/technical`.
* **Skill Tags:** `#skill/python`, `#skill/ux-design`.
* **Evolution Tags:** `#insight/stale` (needs update), `#insight/core`.
* **Project Specific:** `#UI/accessibility`, `#UI/flow`.

> **The Rule of Three:** No more than 5 tags per note. If you need more, your note is too broad and should be split (Atomic Note principle).

---

## 🔗 4. The "Two-Link" Connectivity Minimum

To prevent "The Orphan Trap," a note is **illegal** unless it links to at least two other entities.

1. **Upward Link:** To a higher-level Map of Content (MOC) or Project (e.g., `[[Project/Writing UI]]`).
2. **Sideways Link:** To a related concept or a previous thought (e.g., `[[Note/Web Speech API Comparison]]`).

---

## 🧪 Example: A Compliant Note

**Title:** # Whisper API for Self-Love Journaling
**Purpose:** I am keeping this because the timestamping feature in Whisper allows me to map emotional spikes to specific moments in my recorded voice.

**Metadata:**

* **Project:** `[[Project/Writing UI]]`
* **Status:** `Sapling`
* **Type:** `Technical`
* **Stakeholders:** `[[Self]]`

**Content:**
Whisper provides segment-level timestamps. For the journaling UI, I can use these to highlight "hesitation" or "high energy" segments. This ties back to the **Self-Love** goal by helping me identify topics I find difficult to speak about.

**Links:**

* Connected to: `[[Logic/Frictionless Capture]]`
* Reference: `[[Entity/OpenAI Whisper Documentation]]`

**Tags:** `#UI/accessibility` `#task/implement` `#insight/core`

---

## 🛑 The "Refusal Criteria" (When to delete)

* **The Wikipedia Test:** If the note contains only information that can be found in 5 seconds on Wikipedia or a README file, **delete it**. Keep only your *interpretation* of that data.
* **The "So What?" Test:** If you read the note and your brain doesn't immediately form a connection to your **Project** or **Goal**, it is noise.

---

### Implementation Step

To make this friction-less, you need a **Template**.

**Would you like me to generate a specific "Note-Generator Prompt" that you can feed your raw transcripts into, which will automatically format them into this structured requirement set?**