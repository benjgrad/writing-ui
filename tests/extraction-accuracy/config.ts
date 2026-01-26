/**
 * Configuration for extraction accuracy testing
 */

export const CONFIG = {
  // OpenAI embedding model for semantic strategy
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,

  // Similarity thresholds
  thresholds: {
    // Minimum similarity score to consider notes as duplicates
    duplicateThreshold: 0.85,
    // Minimum similarity to consider notes as related (for consolidation candidates)
    relatedThreshold: 0.7,
    // Minimum similarity for tag matching
    tagSimilarityThreshold: 0.8,
  },

  // Keyword strategy settings (current baseline)
  keyword: {
    maxKeywords: 10,
    titleMatchWeight: 2,
    contentMatchWeight: 1,
    minKeywordLength: 4,
  },

  // Hybrid strategy settings
  hybrid: {
    // Number of candidates from keyword phase
    keywordCandidateLimit: 30,
    // Number of results after semantic reranking
    finalResultLimit: 15,
  },

  // Test runner settings
  runner: {
    // Number of repetitions for statistical significance
    repetitions: 1,
    // Output formats
    outputFormats: ['json', 'console'] as const,
  },

  // NVQ (Note Quality Verification) settings
  nvq: {
    // Minimum NVQ score for a note to pass (out of 10)
    passingThreshold: 7,

    // Aggregate thresholds for test runs
    aggregateThresholds: {
      // Target mean NVQ across all extracted notes
      meanNVQ: 6.5,
      // Target percentage of notes passing (≥7)
      passingRate: 0.7,
      // Maximum acceptable failure rate for any component
      maxComponentFailureRate: 0.3,
    },

    // Component-specific thresholds
    componentThresholds: {
      // Why component (0-3): First-person purpose statement
      why: {
        minScore: 1,
        // Pattern must match for full points
        requireFirstPerson: true,
        requireGoalLink: true,
      },
      // Metadata component (0-2): Status, Type, Stakeholder
      metadata: {
        minScore: 1,
        // Minimum required fields (Status, Type, Stakeholder - Project optional)
        minFieldsRequired: 2,
      },
      // Taxonomy component (0-2): Functional vs topic tags
      taxonomy: {
        minScore: 1,
        // Minimum ratio of functional tags to total tags
        minFunctionalTagRatio: 0.5,
        // Maximum tags before penalty
        maxTags: 5,
      },
      // Connectivity component (0-2): Upward and sideways links
      connectivity: {
        minScore: 1,
        // Both link types required for full score
        requireUpwardLink: true,
        requireSidewaysLink: true,
      },
      // Originality component (0-1): Synthesis vs raw data
      originality: {
        minScore: 0, // Optional, but contributes to total
        // Minimum synthesis ratio (original content / total content)
        minSynthesisRatio: 0.5,
      },
    },

    // Functional tag prefixes that indicate good taxonomy
    functionalTagPrefixes: [
      '#task/',
      '#skill/',
      '#insight/',
      '#decision/',
      '#question/',
      '#UI/',
      '#API/',
      '#pattern/',
      '#tool/',
    ],

    // Topic-only tags that should be avoided or minimized
    topicOnlyTagPatterns: [
      /^#[a-z]+$/i,           // Single word tags like #journaling
      /^#(web|ai|ml|api)$/i,  // Generic tech tags
    ],
  },
} as const

export type OutputFormat = (typeof CONFIG.runner.outputFormats)[number]

// Stop words for keyword extraction (from edge function)
export const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
  'because', 'until', 'while', 'about', 'against', 'this', 'that', 'these',
  'those', 'what', 'which', 'who', 'whom', 'its', 'itself', 'they', 'them',
  'their', 'theirs', 'themselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
  'really', 'think', 'feel', 'like', 'want', 'going', 'know', 'make', 'getting',
  // Additional common words
  'also', 'even', 'much', 'well', 'back', 'now', 'way', 'over', 'such',
  'take', 'come', 'could', 'good', 'look', 'give', 'use', 'her', 'him',
  'his', 'she', 'time', 'see', 'out', 'day', 'get', 'made', 'find', 'long',
])
