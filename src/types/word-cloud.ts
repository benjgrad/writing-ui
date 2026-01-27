export interface WordCloudItem {
  word: string
  type: 'word'
  weight: number        // 1-10 scale for font sizing
  noteCount: number     // total frequency
  recentCount: number   // notes in last 30 days
}

export interface WordCloudSettings {
  hiddenWords: string[] // words the user has dismissed
}

export const WORD_CLOUD_SETTINGS_KEY = 'word_cloud_hidden'
