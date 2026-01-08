export type GoalStatus = 'active' | 'parked' | 'completed' | 'archived'

export interface Goal {
  id: string
  user_id: string
  title: string
  why_root: string | null
  notes: string | null // Medium-long term plans and notes
  status: GoalStatus
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

export interface GoalWithMicroWins extends Goal {
  micro_wins: MicroWin[]
  current_micro_win: MicroWin | null
}

// For creating a new goal
export interface CreateGoalInput {
  title: string
  why_root?: string
  status?: GoalStatus
}

// For updating a goal
export interface UpdateGoalInput {
  title?: string
  why_root?: string
  notes?: string
  status?: GoalStatus
  momentum?: number
  position?: number
}

// For the AI "Why" drilling conversation
export interface WhyDrillingMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface WhyDrillingRequest {
  goal_title: string
  conversation: WhyDrillingMessage[]
}

export interface WhyDrillingResponse {
  message: string
  is_complete: boolean
  why_root?: string // Only present when is_complete is true
}

// Coaching session types
export type CoachingStageType = 'welcome' | 'goal_discovery' | 'why_drilling' | 'micro_win' | 'confirmation' | 'complete'

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

// For creating a new session
export interface CreateCoachingSessionInput {
  goal_id?: string
  stage?: CoachingStageType
}

// For adding a message to a session
export interface AddCoachingMessageInput {
  session_id: string
  role: 'user' | 'assistant'
  content: string
}
