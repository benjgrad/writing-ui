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
