import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local for API keys
config({ path: resolve(process.cwd(), '.env.local') })

export const AI_TEST_CONFIG = {
  // Claude API settings for generating test responses
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-20250514',
  maxTokens: 200,

  // Timing settings
  waitAfterNavigation: 2000,
  waitAfterClick: 500,
  waitForAIResponse: 15000,
  waitBetweenMessages: 1000,

  // URLs
  baseUrl: 'http://localhost:3000',
  goalsUrl: 'http://localhost:3000/goals',
  writeUrl: 'http://localhost:3000/write/new',
  dashboardUrl: 'http://localhost:3000/dashboard',
  graphUrl: 'http://localhost:3000/graph',

  // Selectors based on GoalCoach.tsx
  selectors: {
    // Goal Coach modal
    addGoalButton: 'button:has-text("Add your first goal"), button:has-text("Add")',
    goalCoachModal: '.animate-slide-in-right',
    chatInput: 'textarea[placeholder="Type your response..."]',
    sendButton: 'button[type="submit"]',
    closeButton: 'button:has(svg path[d="M18 6 6 18"])',

    // Messages
    assistantMessage: '[class*="bg-[#f1f5f9]"]',
    userMessage: '[class*="bg-[#6366f1]"]',
    loadingIndicator: '.animate-bounce',

    // Goal summary card
    goalSummaryCard: '[class*="bg-[#f0fdf4]"]',
    goalTitle: '.font-semibold',
    whyRoot: '.italic',
    microWinText: '.flex.items-center.gap-1',

    // Completion
    completionBadge: 'text=Creating your goal...',

    // Stage indicator
    stageLabel: '.text-white\\/80',

    // General UI
    header: 'header',
    mainContent: 'main',
    errorMessage: '[class*="text-[#dc2626]"]',
    loadingSpinner: '.animate-spin',

    // Writing editor
    dreamGradient: '.dream-gradient',
    dreamText: '.dream-text',

    // Goals page
    goalCard: '[class*="rounded-2xl"]',
    emptyState: 'text=Start with one goal',
  },
} as const

export type CoachingStage =
  | 'welcome'
  | 'goal_discovery'
  | 'why_drilling'
  | 'micro_win'
  | 'confirmation'
  | 'complete'

export const STAGE_ORDER: CoachingStage[] = [
  'welcome',
  'goal_discovery',
  'why_drilling',
  'micro_win',
  'confirmation',
  'complete',
]
