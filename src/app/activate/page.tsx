'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--offwhite)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border-light)', borderTopColor: 'var(--navy)', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <ActivateContent />
    </Suspense>
  )
}

function ActivateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const type = searchParams.get('type')

  const [step, setStep] = useState<'verifying' | 'form' | 'error'>('verifying')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function verifyToken() {
      if (!token || type !== 'invite') {
        setError('Invalid or missing activation link.')
        setStep('error')
        return
      }

      try {
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'invite',
        })

        if (verifyErr) {
          setError(verifyErr.message)
          setStep('error')
          return
        }

        setStep('form')
      } catch {
        setError('Failed to verify activation link.')
        setStep('error')
      }
    }

    verifyToken()
  }, [token, type])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      // Update password
      const { error: pwErr } = await supabase.auth.updateUser({ password })
      if (pwErr) {
        setError(pwErr.message)
        setSubmitting(false)
        return
      }

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Session expired. Please use the activation link again.')
        setSubmitting(false)
        return
      }

      // Update profile
      await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      router.push('/admin/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--offwhite)' }}>
      {/* Header */}
      <div style={{ padding: '20px 40px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://hkr.team/hubfs/Navy(spread)_vector.svg" alt="HKR.TEAM" style={{ height: 26 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        {step === 'verifying' && (
          <div className="card anim-up" style={{ maxWidth: 460, width: '100%', padding: 48, textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--border-light)', borderTopColor: 'var(--navy)', borderRadius: '50%', animation: 'spin .6s linear infinite', margin: '0 auto 20px' }} />
            <p style={{ fontSize: 14, color: 'var(--text-sec)' }}>Verifying your invitation...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {step === 'error' && (
          <div className="card anim-up" style={{ maxWidth: 460, width: '100%', padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 16 }}>!</div>
            <h1 style={{ fontSize: 22, color: 'var(--navy)', marginBottom: 8 }}>Activation Failed</h1>
            <p style={{ fontSize: 14, color: 'var(--text-sec)', marginBottom: 24, lineHeight: 1.6 }}>{error}</p>
            <p style={{ fontSize: 13, color: 'var(--text-mut)' }}>
              Please contact your administrator for a new invitation link.
            </p>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="card anim-up" style={{ maxWidth: 460, width: '100%', padding: 48, boxShadow: '0 16px 48px rgba(6,5,52,.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h1 style={{ fontSize: 24, color: 'var(--navy)', marginBottom: 6 }}>Set Up Your Account</h1>
              <p style={{ fontSize: 14, color: 'var(--text-sec)' }}>Complete your profile to access the platform</p>
            </div>

            {error && (
              <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, marginBottom: 20 }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                className="form-input"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              style={{ padding: 14, fontSize: 15, marginTop: 8 }}
              disabled={submitting}
            >
              {submitting ? 'Activating...' : 'Activate Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
