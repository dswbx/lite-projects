export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      goals: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          target_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          description?: string
          target_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          target_date?: string | null
          created_at?: string
        }
        Relationships: []
      }
      milestones: {
        Row: {
          id: string
          goal_id: string
          user_id: string
          title: string
          completed: boolean
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          user_id: string
          title: string
          completed?: boolean
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          user_id?: string
          title?: string
          completed?: boolean
          position?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'milestones_goal_id_fkey'
            columns: ['goal_id']
            isOneToOne: false
            referencedRelation: 'goals'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Goal = Database['public']['Tables']['goals']['Row']
export type Milestone = Database['public']['Tables']['milestones']['Row']
