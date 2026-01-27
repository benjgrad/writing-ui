'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSettings } from './useSettings'
import type { WordCloudItem } from '@/types/word-cloud'
import { WORD_CLOUD_SETTINGS_KEY } from '@/types/word-cloud'

interface NoteRow {
  title: string
  content: string
  created_at: string
}

// Common stopwords to filter out
const STOPWORDS = new Set([
  // Articles & determiners
  'a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  // Pronouns
  'i', 'me', 'we', 'us', 'you', 'he', 'him', 'she', 'it', 'they', 'them', 'who', 'whom', 'what', 'which',
  // Prepositions
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'under', 'over', 'out', 'off', 'down', 'around',
  // Conjunctions
  'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'not', 'only', 'than', 'as', 'if',
  // Verbs (common)
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall', 'need', 'want', 'get', 'got',
  'make', 'made', 'take', 'took', 'go', 'went', 'come', 'came', 'see', 'saw', 'know', 'knew', 'think',
  'thought', 'feel', 'felt', 'say', 'said', 'tell', 'told', 'ask', 'asked', 'use', 'used', 'find', 'found',
  'give', 'gave', 'work', 'worked', 'seem', 'seemed', 'try', 'tried', 'leave', 'left', 'call', 'called',
  // Adverbs
  'very', 'really', 'just', 'also', 'now', 'then', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'any', 'some', 'no', 'more', 'most', 'other', 'such', 'even', 'still', 'again',
  'always', 'never', 'often', 'sometimes', 'usually', 'already', 'soon', 'too', 'well', 'back', 'away',
  // Other common words
  'thing', 'things', 'way', 'ways', 'time', 'times', 'year', 'years', 'day', 'days', 'part', 'parts',
  'place', 'places', 'case', 'cases', 'point', 'points', 'fact', 'facts', 'lot', 'lots', 'bit', 'bits',
  'something', 'anything', 'nothing', 'everything', 'someone', 'anyone', 'everyone', 'nobody',
  'one', 'two', 'three', 'first', 'second', 'last', 'new', 'old', 'good', 'bad', 'great', 'little',
  'big', 'small', 'long', 'short', 'high', 'low', 'right', 'wrong', 'same', 'different', 'own', 'able',
  'many', 'much', 'few', 'less', 'least', 'enough', 'several', 'certain', 'sure', 'true', 'real',
  // Tech/writing specific
  'like', 'etc', 'example', 'note', 'notes', 'see', 'using', 'based', 'need', 'needs', 'important',
  // Contractions
  "i'm", "i've", "i'll", "i'd", "you're", "you've", "you'll", "you'd", "he's", "he'd", "he'll",
  "she's", "she'd", "she'll", "it's", "it'll", "we're", "we've", "we'll", "we'd", "they're",
  "they've", "they'll", "they'd", "that's", "that'll", "that'd", "who's", "who'll", "who'd",
  "what's", "what'll", "what'd", "where's", "where'll", "where'd", "when's", "how's", "why's",
  "isn't", "aren't", "wasn't", "weren't", "hasn't", "haven't", "hadn't", "doesn't", "don't",
  "didn't", "won't", "wouldn't", "couldn't", "shouldn't", "mightn't", "mustn't", "can't",
  "let's", "here's", "there's",
  // More generic words
  'maybe', 'instead', 'because', 'rather', 'without', 'within', 'although', 'though', 'however',
  'therefore', 'whether', 'while', 'since', 'until', 'unless', 'once', 'upon', 'toward', 'towards',
  'across', 'along', 'among', 'behind', 'beneath', 'beside', 'besides', 'beyond', 'except',
  'per', 'via', 'versus', 'despite', 'regarding', 'according',
  'become', 'becomes', 'becoming', 'became', 'create', 'creates', 'creating', 'created',
  'means', 'mean', 'meaning', 'require', 'requires', 'required', 'requiring',
  'suggest', 'suggests', 'suggested', 'include', 'includes', 'including', 'included',
  'provide', 'provides', 'provided', 'allow', 'allows', 'allowed', 'allowing',
  'consider', 'considers', 'considered', 'realize', 'realized', 'realizes',
  'understand', 'understood', 'understands', 'believe', 'believed', 'believes',
  'actually', 'basically', 'essentially', 'generally', 'simply', 'probably', 'possibly',
  'particularly', 'especially', 'specifically', 'currently', 'recently', 'finally',
  'line', 'lines', 'word', 'words', 'text', 'page', 'pages', 'section', 'sections',
  'current', 'previous', 'next', 'following', 'above', 'below',
  'start', 'started', 'starting', 'begin', 'began', 'beginning', 'end', 'ended', 'ending',
  'help', 'helps', 'helped', 'helping', 'support', 'supports', 'supported',
  'keep', 'keeps', 'keeping', 'kept', 'move', 'moves', 'moved', 'moving',
  'put', 'puts', 'putting', 'set', 'sets', 'setting', 'add', 'adds', 'added', 'adding',
  'change', 'changes', 'changed', 'changing', 'turn', 'turns', 'turned', 'turning',
  'show', 'shows', 'showed', 'showing', 'look', 'looks', 'looked', 'looking',
  'run', 'runs', 'running', 'read', 'reads', 'reading', 'write', 'writes', 'wrote', 'writing',
  'build', 'builds', 'built', 'building', 'making',
])

// Extract meaningful words from text
function extractWords(text: string): string[] {
  // Remove markdown formatting, URLs, code blocks
  const cleaned = text
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/`[^`]+`/g, '') // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // markdown links - keep text
    .replace(/https?:\/\/[^\s]+/g, '') // URLs
    .replace(/[#*_~>]/g, '') // markdown symbols
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // wikilinks - keep text

  // Split into words, keeping hyphenated words and apostrophes
  const words = cleaned
    .toLowerCase()
    .split(/[^a-z'-]+/)
    .filter(word => {
      // Must be at least 3 characters
      if (word.length < 3) return false
      // Must not be a stopword
      if (STOPWORDS.has(word)) return false
      // Must contain at least one vowel (filters out abbreviations like "btn", "msg")
      if (!/[aeiouy]/.test(word)) return false
      // Filter out words that are just repeated letters
      if (/^(.)\1+$/.test(word)) return false
      return true
    })

  return words
}

// Calculate 30 days ago for recency filtering
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

export function useWordCloudData() {
  const [items, setItems] = useState<WordCloudItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Hidden words settings
  const {
    value: hiddenWords,
    updateValue: setHiddenWords,
    isLoaded: settingsLoaded
  } = useSettings<string[]>({
    key: WORD_CLOUD_SETTINGS_KEY,
    defaultValue: [],
    localStorageKey: 'word_cloud_hidden'
  })

  const fetchWordCloudData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch all notes with title, content, and created_at
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: notes, error: notesError } = await (supabase as any)
        .from('atomic_notes')
        .select('title, content, created_at')

      if (notesError) throw notesError

      // Also fetch documents for additional content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: documents, error: docsError } = await (supabase as any)
        .from('documents')
        .select('title, content, created_at')
        .eq('is_archived', false)

      if (docsError) throw docsError

      // Count word frequencies
      const wordCounts = new Map<string, { total: number; recent: number }>()

      // Process notes
      for (const note of (notes || []) as NoteRow[]) {
        const isRecent = note.created_at >= THIRTY_DAYS_AGO
        const words = [
          ...extractWords(note.title),
          ...extractWords(note.content)
        ]

        for (const word of words) {
          const current = wordCounts.get(word) || { total: 0, recent: 0 }
          current.total++
          if (isRecent) current.recent++
          wordCounts.set(word, current)
        }
      }

      // Process documents (with lower weight - multiply by 0.5)
      for (const doc of (documents || []) as NoteRow[]) {
        const isRecent = doc.created_at >= THIRTY_DAYS_AGO
        const words = [
          ...extractWords(doc.title),
          ...extractWords(doc.content)
        ]

        for (const word of words) {
          const current = wordCounts.get(word) || { total: 0, recent: 0 }
          current.total += 0.5
          if (isRecent) current.recent += 0.5
          wordCounts.set(word, current)
        }
      }

      // Convert to array and filter low-frequency words
      const minCount = 2 // Must appear at least twice
      const wordArray: Array<{ word: string; total: number; recent: number }> = []
      wordCounts.forEach((counts, word) => {
        if (counts.total >= minCount) {
          wordArray.push({ word, total: counts.total, recent: counts.recent })
        }
      })

      // Sort by total count for percentile ranking
      wordArray.sort((a, b) => a.total - b.total)

      // Use percentile-based ranking for dramatic size differences
      // This guarantees a good spread regardless of count distribution
      const weightedItems: WordCloudItem[] = wordArray.map((item, index) => {
        // Percentile position (0 to 1)
        const percentile = wordArray.length > 1 ? index / (wordArray.length - 1) : 0.5

        // Recency boost (words with higher recent ratio get bumped up)
        const recencyRatio = item.total > 0 ? item.recent / item.total : 0
        const recencyBoost = recencyRatio * 0.15 // Up to 15% boost

        // Weight 1-10 based on percentile + recency
        const weight = Math.max(1, Math.min(10, Math.round(1 + (percentile + recencyBoost) * 9)))

        return {
          word: item.word,
          type: 'word' as const,
          weight,
          noteCount: Math.round(item.total),
          recentCount: Math.round(item.recent)
        }
      })

      // Sort by weight descending for display
      weightedItems.sort((a, b) => b.weight - a.weight || b.noteCount - a.noteCount)

      setItems(weightedItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load word cloud data')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchWordCloudData()
  }, [fetchWordCloudData])

  // Filter out hidden words
  const visibleItems = useMemo(() => {
    const hiddenSet = new Set(hiddenWords.map(w => w.toLowerCase()))
    return items.filter(item => !hiddenSet.has(item.word.toLowerCase()))
  }, [items, hiddenWords])

  // Hide a word
  const hideWord = useCallback((word: string) => {
    setHiddenWords(prev => [...prev, word.toLowerCase()])
  }, [setHiddenWords])

  // Unhide a word
  const unhideWord = useCallback((word: string) => {
    setHiddenWords(prev => prev.filter(w => w.toLowerCase() !== word.toLowerCase()))
  }, [setHiddenWords])

  // Clear all hidden words
  const clearHiddenWords = useCallback(() => {
    setHiddenWords([])
  }, [setHiddenWords])

  return {
    items: visibleItems,
    allItems: items,
    hiddenWords,
    loading: loading || !settingsLoaded,
    error,
    hideWord,
    unhideWord,
    clearHiddenWords,
    refresh: fetchWordCloudData
  }
}
