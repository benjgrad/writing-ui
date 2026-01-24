# Extraction Accuracy Testing Framework

A comprehensive testing framework for evaluating and improving the accuracy of document processing, atomic note extraction, and deduplication in the Zettelkasten-based knowledge management system.

## Overview

This framework addresses three core problems:
1. **Duplicate processing**: Same document being queued multiple times
2. **Poor matching**: Keyword-based retrieval missing semantically similar content
3. **Tag proliferation**: New tags created instead of reusing existing synonyms

## Quick Start

```bash
# Run with default strategy (keyword-baseline)
npm run test:extraction

# Run specific strategy
npm run test:extraction:baseline   # Current production approach
npm run test:extraction:semantic   # Semantic similarity matching

# Compare all strategies
npm run test:extraction:compare
```

## Test Scenarios

### 1. Exact Duplicate Detection
Tests detection when identical content appears in multiple documents.
- **Setup**: Document A contains paragraphs P1, P2, P3; Document B contains P1 (exact), P4, P5
- **Expected**: P1-derived note consolidates with existing, not duplicated

### 2. Paraphrase Detection
Tests detection of semantically equivalent content with different wording.
- **Setup**: Original text about compound learning vs paraphrased version
- **Expected**: Should consolidate as same insight despite different words

### 3. Tag Synonym Handling
Tests reuse of existing tags when content uses synonymous terminology.
- **Setup**: Existing tag "machine-learning", new document uses "ML", "AI/ML"
- **Expected**: Reuse "machine-learning", not create variants

## Strategies

### keyword-baseline
Current production approach from `process-extraction/index.ts`:
- Extracts keywords via stop-word filtering and frequency ranking
- Scores notes by keyword presence (title +2, content +1)
- Fast but misses semantic similarity

**Strengths**: Speed, exact match detection
**Weaknesses**: Fails on paraphrased content (0% F1 on paraphrase scenario)

### semantic
Uses semantic similarity for matching:
- Mock implementation uses concept-based pattern matching
- Production version uses OpenAI embeddings + cosine similarity
- Set `OPENAI_API_KEY` to enable real embeddings

**Strengths**: Detects paraphrases (100% F1)
**Weaknesses**: Slower, requires API for production use

### hybrid
Combines keyword filtering with semantic reranking:
- Phase 1: Fast keyword-based candidate selection
- Phase 2: Semantic reranking of candidates
- Best of both worlds when tuned correctly

**Strengths**: Balanced speed and accuracy
**Weaknesses**: Requires careful threshold tuning

## Metrics

### Duplicate Detection
- **Precision**: Correctly identified duplicates / All flagged duplicates
- **Recall**: Correctly identified duplicates / All actual duplicates
- **F1 Score**: Harmonic mean of precision and recall

### Consolidation
- **Accuracy**: (Correct consolidations + Correct new notes) / Total

### Tag Reuse
- **Reuse Rate**: Tags reused / (Tags reused + Should have reused)

## Results Interpretation

| Metric | Target | Description |
|--------|--------|-------------|
| Dup F1 Score | ≥90% | Overall duplicate detection quality |
| Consolidation Accuracy | ≥80% | Correct consolidation decisions |
| Tag Reuse Rate | ≥95% | Existing tag reuse when appropriate |

## Directory Structure

```
tests/extraction-accuracy/
├── config.ts                 # Configuration and thresholds
├── runner.ts                 # CLI test runner
├── README.md                 # This file
├── metrics/
│   ├── types.ts              # Type definitions
│   ├── calculator.ts         # Metrics calculation
│   └── reporter.ts           # Report generation
├── fixtures/
│   ├── synthetic-generator.ts # Test document generation
│   └── ground-truth.ts       # Expected results evaluation
├── strategies/
│   ├── interface.ts          # Strategy interface
│   ├── keyword-baseline.ts   # Current production approach
│   ├── semantic-embeddings.ts # Semantic similarity
│   └── hybrid.ts             # Combined approach
├── harness/
│   └── extraction-harness.ts # Test wrapper
└── reports/                  # Generated JSON reports
```

## Adding New Scenarios

1. Edit `fixtures/synthetic-generator.ts`
2. Add new scenario function following existing patterns
3. Include in `getAllScenarios()` return array
4. Define expected notes, consolidations, and tags

## Adding New Strategies

1. Create file in `strategies/` implementing `MatchingStrategy`
2. Register with `registerStrategy()` in `runner.ts`
3. Run comparison tests to evaluate

## Zettelkasten Principles

From `Zettelkasten_best_practices.md`:

- **"Double-Entry" Rule**: Same realization written twice must MERGE immediately
- **Redundancy prevention**: Don't create notes that paraphrase documented concepts
- **5-Dimensional Context**: Project, Field, Intent, Entity, Temporal fingerprinting

## Production Integration

To integrate the winning strategy:

1. Create pgvector migration for embeddings
2. Update edge function to use new matching strategy
3. Add embedding generation on note creation
4. Monitor accuracy metrics in production
