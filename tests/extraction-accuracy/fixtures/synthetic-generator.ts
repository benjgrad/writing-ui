/**
 * Synthetic test data generator for extraction accuracy testing
 *
 * Generates documents with controlled characteristics:
 * - Exact duplicates (same content in different documents)
 * - Paraphrased content (semantically equivalent, different wording)
 * - Partial overlaps (some shared sections)
 * - Tag variations (synonymous concepts)
 */

import type {
  SyntheticDocument,
  ExistingNote,
  TestScenario,
  ExpectedNote,
  ExpectedConsolidation,
} from '../metrics/types'

/**
 * Base content blocks that can be reused, paraphrased, or referenced
 */
export const CONTENT_BLOCKS = {
  // Productivity & Habits
  compoundLearning: {
    original: `The power of compound learning lies in consistent daily practice. Small improvements of just 1% per day compound to remarkable results over time. This is why daily habits matter more than occasional bursts of effort.`,
    paraphrase: `Incremental daily progress creates exponential growth through compounding. When you improve slightly each day, these tiny gains stack up dramatically. Consistency beats intensity in the long run.`,
    tags: ['learning', 'habits', 'productivity', 'compound-growth'],
  },

  atomicHabits: {
    original: `Atomic habits are tiny changes that compound over time. The key insight is that habits are the compound interest of self-improvement. Getting 1% better every day is more sustainable than trying to transform overnight.`,
    paraphrase: `Small behavioral adjustments accumulate into major life changes. Your daily routines are like interest payments on your personal development - modest but consistent growth beats dramatic sporadic efforts.`,
    tags: ['habits', 'self-improvement', 'productivity', 'behavior-change'],
  },

  // Writing & Creativity
  writingFlow: {
    original: `Writing in flow state requires removing all distractions and surrendering to the process. The inner critic must be silenced during the first draft. Editing comes later - creation and critique are separate phases.`,
    paraphrase: `Achieving creative flow while writing means eliminating interruptions and trusting the process. Your internal editor should be muted during initial drafting. The revision phase is distinct from the generative phase.`,
    tags: ['writing', 'creativity', 'flow-state', 'productivity'],
  },

  // Knowledge Management
  zettelkastenPrinciple: {
    original: `A Zettelkasten works because each note contains exactly one idea. This atomicity enables flexible recombination. Notes link to each other, forming an emergent web of knowledge that grows smarter over time.`,
    paraphrase: `The Zettelkasten method succeeds due to its single-idea-per-note rule. This granularity allows ideas to be remixed freely. The interconnected notes create an evolving network of understanding.`,
    tags: ['zettelkasten', 'note-taking', 'knowledge-management', 'pkm'],
  },

  // Software Development
  refactoringPrinciple: {
    original: `Refactoring improves code structure without changing behavior. The key is to make small, incremental changes while keeping tests passing. Never refactor and add features in the same commit.`,
    paraphrase: `Code restructuring maintains functionality while improving design. The approach involves gradual modifications validated by continuous testing. Feature additions and structural improvements should be separate changes.`,
    tags: ['refactoring', 'software-development', 'clean-code', 'programming'],
  },

  // Health & Wellness
  exerciseMentalClarity: {
    original: `Regular exercise improves mental clarity and reduces stress. Even a 20-minute walk can boost cognitive function for hours afterward. Physical movement is essential for creative thinking.`,
    paraphrase: `Physical activity enhances cognitive function and lowers anxiety. Brief periods of movement, like short walks, provide extended mental benefits. Bodily exercise supports imaginative thought processes.`,
    tags: ['exercise', 'mental-health', 'productivity', 'wellness'],
  },

  sleepLearning: {
    original: `Sleep consolidates learning and memory. During deep sleep, the brain processes and integrates new information. Skipping sleep to study more is counterproductive - rest is when learning solidifies.`,
    paraphrase: `Rest periods cement knowledge acquisition and recall. The brain organizes and incorporates fresh information during slumber. Sacrificing sleep for extra study time undermines the consolidation process.`,
    tags: ['sleep', 'learning', 'memory', 'health'],
  },
} as const

/**
 * Generate a unique document ID
 */
function generateId(prefix: string, index: number): string {
  return `${prefix}-${index.toString().padStart(3, '0')}`
}

/**
 * Create a document with the given content blocks
 */
function createDocument(
  id: string,
  blocks: string[],
  metadata: SyntheticDocument['metadata'] = {}
): SyntheticDocument {
  return {
    id,
    content: blocks.join('\n\n'),
    metadata,
  }
}

/**
 * Create an existing note from a content block
 */
function createExistingNote(
  id: string,
  title: string,
  content: string,
  tags: string[]
): ExistingNote {
  return { id, title, content, tags }
}

/**
 * Scenario 1: Exact Duplicate Detection
 *
 * Tests the system's ability to detect when the same content appears
 * in multiple documents and consolidate appropriately.
 */
export function createExactDuplicateScenario(): TestScenario {
  const existingNotes: ExistingNote[] = [
    createExistingNote(
      'existing-001',
      'The Power of Compound Learning',
      CONTENT_BLOCKS.compoundLearning.original,
      ['learning', 'habits', 'compound-growth']
    ),
  ]

  const documents: SyntheticDocument[] = [
    // Document A: Contains original compound learning content + new content
    createDocument('doc-001', [
      CONTENT_BLOCKS.compoundLearning.original, // Should consolidate
      CONTENT_BLOCKS.writingFlow.original, // Should create new note
    ], {
      hasExactDuplicateOf: 'existing-001',
      expectedTags: ['learning', 'habits', 'compound-growth', 'writing', 'creativity', 'flow-state'],
      expectedConsolidations: ['The Power of Compound Learning'],
    }),

    // Document B: Contains different content but references same concepts
    createDocument('doc-002', [
      CONTENT_BLOCKS.atomicHabits.original, // Related but distinct
      CONTENT_BLOCKS.exerciseMentalClarity.original, // New topic
    ], {
      expectedTags: ['habits', 'self-improvement', 'exercise', 'mental-health'],
    }),
  ]

  const expectedNotes: ExpectedNote[] = [
    // Writing flow should be new
    {
      titlePatterns: ['writing', 'flow', 'creative'],
      requiredPhrases: ['flow state', 'distractions', 'first draft', 'editing'],
      shouldConsolidateWith: null,
      expectedTags: ['writing', 'creativity', 'flow-state'],
      expectedConnections: [],
    },
    // Atomic habits should be new but connect to compound learning
    {
      titlePatterns: ['atomic', 'habits', 'tiny', 'changes'],
      requiredPhrases: ['atomic habits', 'compound', '1%'],
      shouldConsolidateWith: null,
      expectedTags: ['habits', 'self-improvement'],
      expectedConnections: [
        {
          targetTitlePattern: 'compound learning|power of compound',
          types: ['related', 'extends', 'supports'],
        },
      ],
    },
    // Exercise note should be new
    {
      titlePatterns: ['exercise', 'mental', 'clarity', 'physical'],
      requiredPhrases: ['exercise', 'mental clarity', 'cognitive'],
      shouldConsolidateWith: null,
      expectedTags: ['exercise', 'mental-health', 'wellness'],
      expectedConnections: [],
    },
  ]

  const expectedConsolidations: ExpectedConsolidation[] = [
    {
      newContentPattern: 'compound learning.*daily practice|1% per day',
      existingNoteTitle: 'The Power of Compound Learning',
      mergedContentPhrases: ['compound', 'daily', 'improvements'],
    },
  ]

  return {
    name: 'Exact Duplicate Detection',
    description: 'Tests detection and consolidation of exact duplicate content across documents',
    documents,
    existingNotes,
    existingTags: ['learning', 'habits', 'compound-growth'],
    expectedNotes,
    expectedConsolidations,
  }
}

/**
 * Scenario 2: Paraphrase Detection
 *
 * Tests the system's ability to recognize semantically equivalent
 * content that uses different wording.
 */
export function createParaphraseScenario(): TestScenario {
  const existingNotes: ExistingNote[] = [
    createExistingNote(
      'existing-001',
      'Zettelkasten Single-Idea Notes',
      CONTENT_BLOCKS.zettelkastenPrinciple.original,
      ['zettelkasten', 'note-taking', 'knowledge-management']
    ),
    createExistingNote(
      'existing-002',
      'Exercise Boosts Mental Clarity',
      CONTENT_BLOCKS.exerciseMentalClarity.original,
      ['exercise', 'mental-health', 'productivity']
    ),
    createExistingNote(
      'existing-003',
      'Sleep and Memory Consolidation',
      CONTENT_BLOCKS.sleepLearning.original,
      ['sleep', 'learning', 'memory']
    ),
  ]

  const documents: SyntheticDocument[] = [
    // Document with paraphrased content that should consolidate
    createDocument('doc-001', [
      CONTENT_BLOCKS.zettelkastenPrinciple.paraphrase, // Paraphrase - should consolidate
      CONTENT_BLOCKS.refactoringPrinciple.original, // New content
    ], {
      paraphrasedFrom: 'existing-001',
      expectedConsolidations: ['Zettelkasten Single-Idea Notes'],
    }),

    // Another document with paraphrased content
    createDocument('doc-002', [
      CONTENT_BLOCKS.exerciseMentalClarity.paraphrase, // Paraphrase - should consolidate
      CONTENT_BLOCKS.sleepLearning.paraphrase, // Paraphrase - should consolidate
    ], {
      paraphrasedFrom: 'existing-002',
      expectedConsolidations: ['Exercise Boosts Mental Clarity', 'Sleep and Memory Consolidation'],
    }),
  ]

  const expectedNotes: ExpectedNote[] = [
    // Refactoring should be new
    {
      titlePatterns: ['refactoring', 'code', 'structure'],
      requiredPhrases: ['refactoring', 'behavior', 'incremental', 'tests'],
      shouldConsolidateWith: null,
      expectedTags: ['refactoring', 'software-development', 'clean-code'],
      expectedConnections: [],
    },
  ]

  const expectedConsolidations: ExpectedConsolidation[] = [
    {
      newContentPattern: 'single-idea-per-note|granularity|remixed',
      existingNoteTitle: 'Zettelkasten Single-Idea Notes',
      mergedContentPhrases: ['atomicity', 'single', 'idea', 'note'],
    },
    {
      newContentPattern: 'physical activity|cognitive function|anxiety',
      existingNoteTitle: 'Exercise Boosts Mental Clarity',
      mergedContentPhrases: ['exercise', 'mental', 'clarity'],
    },
    {
      newContentPattern: 'rest periods|knowledge acquisition|slumber',
      existingNoteTitle: 'Sleep and Memory Consolidation',
      mergedContentPhrases: ['sleep', 'memory', 'consolidation'],
    },
  ]

  return {
    name: 'Paraphrase Detection',
    description: 'Tests detection and consolidation of semantically equivalent paraphrased content',
    documents,
    existingNotes,
    existingTags: ['zettelkasten', 'note-taking', 'knowledge-management', 'exercise', 'mental-health', 'sleep', 'learning', 'memory'],
    expectedNotes,
    expectedConsolidations,
  }
}

/**
 * Scenario 3: Tag Synonym Handling
 *
 * Tests the system's ability to reuse existing tags when new content
 * uses synonymous terms instead of creating duplicate tags.
 */
export function createTagSynonymScenario(): TestScenario {
  const existingTags = [
    'machine-learning',
    'artificial-intelligence',
    'productivity',
    'note-taking',
    'software-development',
    'health',
    'fitness',
  ]

  const existingNotes: ExistingNote[] = [
    createExistingNote(
      'existing-001',
      'Machine Learning Fundamentals',
      'Machine learning is a subset of artificial intelligence that enables systems to learn from data.',
      ['machine-learning', 'artificial-intelligence']
    ),
  ]

  // Documents using synonymous terms
  const documents: SyntheticDocument[] = [
    // Document using ML variations
    createDocument('doc-001', [
      `Deep learning and neural networks are revolutionizing AI/ML applications. The intersection of ML and data science creates powerful predictive models. Modern machine learning techniques enable unprecedented pattern recognition.`,
    ], {
      expectedTags: ['machine-learning', 'artificial-intelligence'], // Should reuse, not create 'ML', 'AI', 'deep-learning'
    }),

    // Document using productivity variations
    createDocument('doc-002', [
      `Personal knowledge management (PKM) systems help with being productive and managing your notes effectively. Good note management leads to better work output and efficiency.`,
    ], {
      expectedTags: ['productivity', 'note-taking'], // Should reuse, not create 'PKM', 'being-productive', 'efficiency'
    }),

    // Document using health/fitness variations
    createDocument('doc-003', [
      `Physical wellness and exercise are crucial for maintaining good health. Regular workouts and staying fit improves both physical and mental wellbeing.`,
    ], {
      expectedTags: ['health', 'fitness'], // Should reuse, not create 'wellness', 'workouts', 'wellbeing'
    }),
  ]

  const expectedNotes: ExpectedNote[] = [
    {
      titlePatterns: ['deep learning', 'neural', 'AI', 'ML'],
      requiredPhrases: ['deep learning', 'neural networks', 'pattern recognition'],
      shouldConsolidateWith: null,
      expectedTags: ['machine-learning', 'artificial-intelligence'],
      expectedConnections: [
        {
          targetTitlePattern: 'Machine Learning Fundamentals',
          types: ['related', 'extends'],
        },
      ],
    },
    {
      titlePatterns: ['knowledge management', 'PKM', 'productivity'],
      requiredPhrases: ['knowledge management', 'notes', 'productive'],
      shouldConsolidateWith: null,
      expectedTags: ['productivity', 'note-taking'],
      expectedConnections: [],
    },
    {
      titlePatterns: ['wellness', 'exercise', 'health', 'fitness'],
      requiredPhrases: ['wellness', 'exercise', 'health'],
      shouldConsolidateWith: null,
      expectedTags: ['health', 'fitness'],
      expectedConnections: [],
    },
  ]

  return {
    name: 'Tag Synonym Handling',
    description: 'Tests reuse of existing tags when content uses synonymous terminology',
    documents,
    existingNotes,
    existingTags,
    expectedNotes,
    expectedConsolidations: [],
  }
}

/**
 * Get all test scenarios
 */
export function getAllScenarios(): TestScenario[] {
  return [
    createExactDuplicateScenario(),
    createParaphraseScenario(),
    createTagSynonymScenario(),
  ]
}

/**
 * Get a specific scenario by name
 */
export function getScenario(name: string): TestScenario | undefined {
  return getAllScenarios().find(s => s.name === name)
}
