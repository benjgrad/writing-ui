// Re-export pursuit types with legacy "Goal" aliases for backward compatibility
// New code should import from '@/types/pursuit' directly
export type {
  Pursuit as Goal,
  PursuitStatus as GoalStatus,
  PursuitWithMicroWins as GoalWithMicroWins,
  CreatePursuitInput as CreateGoalInput,
  UpdatePursuitInput as UpdateGoalInput,
  MicroWin,
  CoachingSession,
  CoachingMessage,
  CoachingSessionWithMessages,
  CoachingStageType,
  CreateCoachingSessionInput,
  AddCoachingMessageInput,
  DomainScores,
  PursuitDomain,
  PursuitCompleteness,
} from './pursuit'

// Legacy types that aren't in pursuit.ts
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
  why_root?: string
}
