import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as SupabaseClient)

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      assessments: {
        Row: {
          id: string
          title: string
          description: string | null
          type: 'scoring' | 'open'
          status: 'active' | 'draft' | 'archived'
          project_id: string | null
          role: string | null
          time_limit: number
          pass_threshold: number | null
          sections: Section[]
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['assessments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['assessments']['Insert']>
      }
      candidates: {
        Row: {
          id: string
          name: string
          email: string
          source: 'manual' | 'link' | 'lever'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['candidates']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['candidates']['Insert']>
      }
      submissions: {
        Row: {
          id: string
          assessment_id: string
          candidate_id: string
          token: string
          status: 'pending' | 'in_progress' | 'completed' | 'expired'
          answers: Record<string, unknown>
          score: number | null
          passed: boolean | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['submissions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['submissions']['Insert']>
      }
      projects: {
        Row: {
          id: string
          name: string
          client: string | null
          team: string | null
          description: string | null
          lever_tag: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
    }
  }
}

export type Section = {
  title: string
  questions: Question[]
}

export type Question = {
  id: string
  type: 'multiple_choice' | 'fill_blank' | 'written' | 'ranking'
  text: string
  points: number
  weight: number
  options?: string[]
  correct?: number
  accepted_answers?: string[]
  items?: string[]
  min_words?: number
  max_words?: number
}

export type Assessment = Database['public']['Tables']['assessments']['Row']
export type Candidate = Database['public']['Tables']['candidates']['Row']
export type Submission = Database['public']['Tables']['submissions']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
