export type GoalStatus = 'active' | 'parked' | 'completed' | 'archived'

export interface Goal {
  id: string
  user_id: string
  title: string
  why_root: string | null
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
