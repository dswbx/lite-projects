export type MovieUpdate = {
  title?: string
  notes?: string | null
  watched?: boolean
  rating?: number | null
  review?: string | null
}

export type Movie = {
  id: string
  user_id: string
  title: string
  notes: string | null
  watched: boolean
  rating: number | null
  review: string | null
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      movies: {
        Row: Movie
        Insert: {
          id?: string
          user_id: string
          title: string
          notes?: string | null
          watched?: boolean
          rating?: number | null
          review?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: MovieUpdate
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
