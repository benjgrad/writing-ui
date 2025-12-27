export interface WordWithTimestamp {
  id: string
  word: string
  typedAt: number
}

export interface Document {
  id: string
  user_id: string
  title: string
  content: string
  content_with_timestamps: WordWithTimestamp[]
  word_count: number
  is_archived: boolean
  last_prompt_shown: string | null
  created_at: string
  updated_at: string
}
