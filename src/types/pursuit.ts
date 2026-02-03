// Aristotelian life domains
export type PursuitDomain =
  | 'sophia'     // Intellectual Excellence
  | 'phronesis'  // Practical Wisdom
  | 'arete'      // Character & Virtue
  | 'koinonia'   // Community & Justice
  | 'soma'       // Physical Flourishing
  | 'techne'     // Creative Expression
  | 'theoria'    // Contemplation

// Score vector across all 7 domains (each pursuit contributes to multiple domains)
export type DomainScores = Record<PursuitDomain, number>

export type PursuitStatus = 'active' | 'parked' | 'fulfilled' | 'archived'

export interface PursuitCompleteness {
  title: boolean
  why: boolean
  steps: boolean
  notes: boolean
}

export interface Pursuit {
  id: string
  user_id: string
  title: string
  why_root: string | null
  notes: string | null
  status: PursuitStatus
  domain_scores: DomainScores
  completeness: PursuitCompleteness
  momentum: number // 1-5: 1=Stuck, 5=Flowing
  position: number
  created_at: string
  updated_at: string
  current_micro_win?: MicroWin | null
  micro_wins?: MicroWin[]
}

export interface MicroWin {
  id: string
  goal_id: string
  description: string
  is_current: boolean
  completed_at: string | null
  position: number
  created_at: string
}

export interface PursuitWithMicroWins extends Pursuit {
  micro_wins: MicroWin[]
  current_micro_win: MicroWin | null
}

export interface CreatePursuitInput {
  title: string
  why_root?: string
  status?: PursuitStatus
  domain_scores?: DomainScores
}

export interface UpdatePursuitInput {
  title?: string
  why_root?: string
  notes?: string
  status?: PursuitStatus
  momentum?: number
  position?: number
  domain_scores?: DomainScores
  completeness?: PursuitCompleteness
}

// Onboarding types
export interface OnboardingItem {
  label: string
  domainScores: DomainScores
}

export interface OnboardingSelection extends OnboardingItem {
  isPredefined: boolean
}

export interface OnboardingState {
  completed: boolean
  completedAt?: string
  selections?: OnboardingSelection[]
}

// Re-exports for coaching (unchanged structure, renamed semantics)
export type CoachingStageType =
  | 'welcome'
  | 'goal_discovery'
  | 'why_drilling'
  | 'micro_win'
  | 'confirmation'
  | 'complete'
  | 'deepen'

export interface CoachingSession {
  id: string
  goal_id: string | null
  user_id: string
  stage: CoachingStageType
  is_active: boolean
  created_at: string
  updated_at: string
  messages?: CoachingMessage[]
}

export interface CoachingMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface CoachingSessionWithMessages extends CoachingSession {
  messages: CoachingMessage[]
}

export interface CreateCoachingSessionInput {
  goal_id?: string
  stage?: CoachingStageType
}

export interface AddCoachingMessageInput {
  session_id: string
  role: 'user' | 'assistant'
  content: string
}

// Default domain scores (all zeros)
export const EMPTY_DOMAIN_SCORES: DomainScores = {
  sophia: 0,
  phronesis: 0,
  arete: 0,
  koinonia: 0,
  soma: 0,
  techne: 0,
  theoria: 0,
}

// Default scores for custom user-written items
export const DEFAULT_CUSTOM_SCORES: DomainScores = {
  sophia: 1,
  phronesis: 1,
  arete: 1,
  koinonia: 1,
  soma: 1,
  techne: 1,
  theoria: 1,
}

// Default completeness for a newly created pursuit (title only)
export const DEFAULT_COMPLETENESS: PursuitCompleteness = {
  title: true,
  why: false,
  steps: false,
  notes: false,
}
