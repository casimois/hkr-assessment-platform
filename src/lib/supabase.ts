import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

let _supabase: SupabaseClient | null = null
let _cleaned = false

/**
 * Clear stale Supabase localStorage keys left over from when we
 * temporarily used createClient (localStorage-based auth).
 * createBrowserClient uses cookies, so these old keys cause conflicts.
 */
function clearStaleStorage() {
  if (_cleaned) return
  _cleaned = true
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(k => {
      console.log('[supabase] removing stale localStorage key:', k)
      localStorage.removeItem(k)
    })
  } catch {
    // localStorage not available
  }
}

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase
  // Only create in browser — SSR/prerender must never call createBrowserClient
  if (typeof window === 'undefined' || !supabaseUrl || !supabaseAnonKey) return null

  // Clear stale localStorage tokens from previous createClient usage
  clearStaleStorage()

  try {
    _supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      // Disable the @supabase/ssr singleton cache so our auth options are
      // always applied (the internal cache ignores options on subsequent calls).
      isSingleton: false,
      auth: {
        // Disable navigator.locks — orphaned Web Locks from previous
        // sessions / React Strict Mode cause 5-second timeouts + AbortErrors.
        // A no-op lock is safe for a single-tab app.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lock: (async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
          return fn()
        }) as any,
      },
    })
  } catch (err) {
    console.error('createBrowserClient failed:', err)
    return null
  }
  return _supabase
}

// Proxy that lazily initializes the client on first property access
// Returns undefined during SSR — auth.tsx guards with isSupabaseConfigured + supabase?.auth
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase()
    if (!client) return undefined
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

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
          selected_sections: Section[] | null
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
  /** Enable question pool randomization for this section (MC + fill_blank only) */
  randomize?: boolean
  /** How many MC + fill_blank questions to show per candidate (when randomize=true) */
  pool_size?: number
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
  image_url?: string
}

export type Assessment = Database['public']['Tables']['assessments']['Row']
export type Candidate = Database['public']['Tables']['candidates']['Row']
export type Submission = Database['public']['Tables']['submissions']['Row']
export type Project = Database['public']['Tables']['projects']['Row']

export type UserRole = 'super_admin' | 'admin' | 'user'
export type UserStatus = 'active' | 'inactive' | 'pending'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  status: UserStatus
  assigned_teams: string[]
  assigned_clients: string[]
  invited_by: string | null
  last_login: string | null
  created_at: string
  updated_at: string
}
