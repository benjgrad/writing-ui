export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          learning_goals: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          learning_goals?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          learning_goals?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          content_with_timestamps: Json
          word_count: number
          is_archived: boolean
          last_prompt_shown: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          content?: string
          content_with_timestamps?: Json
          word_count?: number
          is_archived?: boolean
          last_prompt_shown?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          content_with_timestamps?: Json
          word_count?: number
          is_archived?: boolean
          last_prompt_shown?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      atomic_notes: {
        Row: {
          id: string
          user_id: string
          source_document_id: string | null
          title: string
          content: string
          note_type: string
          ai_generated: boolean
          user_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_document_id?: string | null
          title: string
          content: string
          note_type?: string
          ai_generated?: boolean
          user_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source_document_id?: string | null
          title?: string
          content?: string
          note_type?: string
          ai_generated?: boolean
          user_verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string | null
          created_at?: string
        }
      }
      note_tags: {
        Row: {
          note_id: string
          tag_id: string
        }
        Insert: {
          note_id: string
          tag_id: string
        }
        Update: {
          note_id?: string
          tag_id?: string
        }
      }
      note_connections: {
        Row: {
          id: string
          user_id: string
          source_note_id: string
          target_note_id: string
          connection_type: string
          strength: number
          ai_generated: boolean
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_note_id: string
          target_note_id: string
          connection_type?: string
          strength?: number
          ai_generated?: boolean
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source_note_id?: string
          target_note_id?: string
          connection_type?: string
          strength?: number
          ai_generated?: boolean
          description?: string | null
          created_at?: string
        }
      }
      note_attributes: {
        Row: {
          id: string
          note_id: string
          key: string
          value: string
          created_at: string
        }
        Insert: {
          id?: string
          note_id: string
          key: string
          value: string
          created_at?: string
        }
        Update: {
          id?: string
          note_id?: string
          key?: string
          value?: string
          created_at?: string
        }
      }
      prompt_history: {
        Row: {
          id: string
          user_id: string
          document_id: string | null
          context_text: string
          prompt_generated: string
          was_helpful: boolean | null
          provider: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id?: string | null
          context_text: string
          prompt_generated: string
          was_helpful?: boolean | null
          provider: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_id?: string | null
          context_text?: string
          prompt_generated?: string
          was_helpful?: boolean | null
          provider?: string
          created_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          title: string
          why_root: string | null
          status: 'active' | 'parked' | 'completed' | 'archived'
          momentum: number
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          why_root?: string | null
          status?: 'active' | 'parked' | 'completed' | 'archived'
          momentum?: number
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          why_root?: string | null
          status?: 'active' | 'parked' | 'completed' | 'archived'
          momentum?: number
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      micro_wins: {
        Row: {
          id: string
          goal_id: string
          description: string
          is_current: boolean
          completed_at: string | null
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          description: string
          is_current?: boolean
          completed_at?: string | null
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          description?: string
          is_current?: boolean
          completed_at?: string | null
          position?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
