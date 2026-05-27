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
      workouts: {
        Row: {
          id: string
          user_id: string
          title: string
          notes: string | null
          workout_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          notes?: string | null
          workout_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          notes?: string | null
          workout_date?: string
          created_at?: string
        }
      }
      workout_exercises: {
        Row: {
          id: string
          workout_id: string
          user_id: string
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          workout_id: string
          user_id: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          workout_id?: string
          user_id?: string
          name?: string
          sort_order?: number
        }
      }
      exercise_sets: {
        Row: {
          id: string
          exercise_id: string
          user_id: string
          set_number: number
          reps: number
          weight_lbs: number
        }
        Insert: {
          id?: string
          exercise_id: string
          user_id: string
          set_number: number
          reps: number
          weight_lbs?: number
        }
        Update: {
          id?: string
          exercise_id?: string
          set_number?: number
          reps?: number
          weight_lbs?: number
        }
      }
    }
  }
}

export type Workout = Database['public']['Tables']['workouts']['Row']
export type WorkoutExercise = Database['public']['Tables']['workout_exercises']['Row']
export type ExerciseSet = Database['public']['Tables']['exercise_sets']['Row']

export type WorkoutWithDetails = Workout & {
  workout_exercises: (WorkoutExercise & {
    exercise_sets: ExerciseSet[]
  })[]
}
