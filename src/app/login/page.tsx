'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function LoginPage() {
  const { user, loading, signIn } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showSlow, setShowSlow] = useState(false)
  const [isDeactivated, setIsDeactivated] = useState(false)

  // Read query param client-side to avoid useSearchParams Suspense requirement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setIsDeactivated(params.get('deactivated') === '1')
    }
  }, [])

  useEffect(() => {
    if (!loading && user) router.push('/admin/dashboard')
  }, [user, loading, router])

  // Show "taking too long" message after 3 seconds of loading
  useEffect(() => {
    if (!loading) return
    const t = setTimeout(() => setShowSlow(true), 3000)
    return () => clearTimeout(t)
  }, [loading])

  const handleClearAndReload = () => {
    try {
      // Clear all Supabase-related storage
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('sb-')) keysToRemove.push(key)
      }
      keysToRemove.forEach(k => localStorage.removeItem(k))
      // Clear cookies too
      document.cookie.split(';').forEach(c => {
        const name = c.split('=')[0].trim()
        if (name.startsWith('sb-')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        }
      })
    } catch { /* ignore */ }
    window.location.reload()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error)
      setSubmitting(false)
    } else {
      router.push('/admin/dashboard')
    }
  }

  if (loading || user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--offwhite)', gap: 16 }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border-light)', borderTopColor: 'var(--navy)', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />
        {showSlow && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-sec)', marginBottom: 12 }}>Taking longer than expected…</p>
            <button
              onClick={handleClearAndReload}
              style={{ fontSize: 13, color: 'var(--navy)', background: 'none', border: '1px solid var(--border-light)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}
            >
              Clear cache &amp; reload
            </button>
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--offwhite)' }}>
      <div style={{ padding: '20px 40px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://hkr.team/hubfs/Navy(spread)_vector.svg" alt="HKR.TEAM" style={{ height: 26 }} />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <form onSubmit={handleSubmit} className="card anim-up" style={{ maxWidth: 460, width: '100%', padding: '48px', boxShadow: '0 16px 48px rgba(6,5,52,.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{ fontSize: 24, color: 'var(--navy)', marginBottom: 6 }}>Sign In</h1>
            <p style={{ fontSize: 14, color: 'var(--text-sec)' }}>Access the HKR.TEAM assessment platform</p>
          </div>

          {isDeactivated && !error && (
            <div style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, marginBottom: 20, lineHeight: 1.5 }}>
              You do not have permission to access the platform. Please contact your administrator.
            </div>
          )}

          {error && (
            <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@hkr.team" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
          </div>

          <button type="submit" className="btn btn-primary btn-full" style={{ padding: 14, fontSize: 15, marginTop: 8 }} disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  )
}
