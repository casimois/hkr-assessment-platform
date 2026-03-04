'use client'
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import type { Profile } from './supabase'
import { User } from '@supabase/supabase-js'

type AuthContextType = {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      // If account is deactivated, sign out and redirect with message
      if (data?.status === 'inactive') {
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        if (typeof window !== 'undefined') {
          window.location.href = '/login?deactivated=1'
        }
        return
      }

      setProfile(data as Profile | null)
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      setProfile(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }, [user, fetchProfile])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let subscription: { unsubscribe: () => void } | null = null
    let resolved = false

    const done = () => {
      if (!resolved) {
        resolved = true
        setLoading(false)
      }
    }

    // Safety timeout: if auth init takes > 4s, force loading=false
    // so the login form shows and the user can sign in manually
    const timeout = setTimeout(() => {
      if (!resolved) {
        console.warn('[auth] Safety timeout — forcing loading=false after 4s')
        done()
      }
    }, 4000)

    try {
      const auth = supabase.auth
      if (!auth) {
        done()
        clearTimeout(timeout)
        return
      }

      // Use onAuthStateChange as the PRIMARY session source.
      // getSession() can hang due to internal lock contention, but
      // onAuthStateChange fires immediately with INITIAL_SESSION/SIGNED_IN.
      const { data } = auth.onAuthStateChange((_event, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) {
          // Fire-and-forget profile fetch — don't block done()
          fetchProfile(u.id)
        } else {
          setProfile(null)
        }
        done()
      })
      subscription = data.subscription

      // Also call getSession as a fallback in case onAuthStateChange
      // doesn't fire (e.g., no session at all).
      auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          // No session — make sure we stop loading
          setUser(null)
          done()
        }
        // If there IS a session, onAuthStateChange already handled it
      }).catch(() => {
        done()
      })
    } catch (err) {
      console.error('[auth] Auth init error:', err)
      done()
    }

    return () => {
      clearTimeout(timeout)
      subscription?.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase not configured' }
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }

    if (data.user) {
      // Fetch profile and check if account is active
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileData?.status === 'inactive') {
        // Account is deactivated — sign out immediately and return error
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        return { error: 'Your account has been deactivated. Please contact an administrator.' }
      }

      setProfile(profileData as Profile | null)

      // Update last_login
      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id)
    }

    return { error: null }
  }

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
