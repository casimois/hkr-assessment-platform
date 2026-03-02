'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/lib/supabase'

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  user: 'User',
}

export default function AccountPage() {
  const { user, profile, refreshProfile } = useAuth()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [nameMsg, setNameMsg] = useState('')
  const [nameSaving, setNameSaving] = useState(false)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)

  async function handleNameSave() {
    if (!user || !fullName.trim()) return
    setNameSaving(true)
    setNameMsg('')

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) {
      setNameMsg('Failed to update name.')
    } else {
      setNameMsg('Name updated.')
      await refreshProfile()
    }
    setNameSaving(false)
  }

  async function handlePasswordChange() {
    setPwMsg('')
    setPwError(false)

    if (password.length < 8) {
      setPwMsg('Password must be at least 8 characters.')
      setPwError(true)
      return
    }
    if (password !== confirmPassword) {
      setPwMsg('Passwords do not match.')
      setPwError(true)
      return
    }

    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setPwMsg(error.message)
      setPwError(true)
    } else {
      setPwMsg('Password updated successfully.')
      setPwError(false)
      setPassword('')
      setConfirmPassword('')
    }
    setPwSaving(false)
  }

  return (
    <div className="anim-up" style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, color: 'var(--navy)', marginBottom: 4 }}>Account</h1>
        <p style={{ fontSize: 14, color: 'var(--text-mut)' }}>Manage your profile and security settings</p>
      </div>

      {/* Profile Section */}
      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 20 }}>Profile</h3>

        <div className="form-group">
          <label className="form-label">Full Name</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              className="form-input"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
            />
            <button className="btn btn-primary btn-sm" onClick={handleNameSave} disabled={nameSaving} style={{ flexShrink: 0 }}>
              {nameSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
          {nameMsg && (
            <div className="form-hint" style={{ color: 'var(--success)', marginTop: 6 }}>{nameMsg}</div>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={user?.email ?? ''} readOnly style={{ background: 'var(--cream)', color: 'var(--text-sec)' }} />
        </div>

        <div className="form-group" style={{ marginTop: 20, marginBottom: 0 }}>
          <label className="form-label">Role</label>
          <input className="form-input" type="text" value={profile ? ROLE_LABELS[profile.role] : '—'} readOnly style={{ background: 'var(--cream)', color: 'var(--text-sec)' }} />
        </div>
      </div>

      {/* Password Section */}
      <div className="card card-pad">
        <h3 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 20 }}>Change Password</h3>

        <div className="form-group">
          <label className="form-label">New Password</label>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <input
            className="form-input"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
          />
        </div>

        {pwMsg && (
          <div style={{
            background: pwError ? 'var(--danger-light)' : 'var(--success-light)',
            color: pwError ? 'var(--danger)' : 'var(--success)',
            padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, marginBottom: 16,
          }}>
            {pwMsg}
          </div>
        )}

        <button className="btn btn-primary btn-sm" onClick={handlePasswordChange} disabled={pwSaving}>
          {pwSaving ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}
