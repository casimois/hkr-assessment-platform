'use client'
import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

type Props = {
  isOpen: boolean
  onClose: () => void
  assessments: { id: string; title: string }[]
}

export default function InviteModal({ isOpen, onClose, assessments }: Props) {
  const [assessmentId, setAssessmentId] = useState(assessments[0]?.id || '')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSend = async () => {
    if (!name.trim() || !email.trim() || !assessmentId) return
    setSending(true)
    setError('')
    try {
      if (!isSupabaseConfigured) throw new Error('Supabase not configured')

      // Upsert candidate
      const { data: candidate, error: candErr } = await supabase
        .from('candidates')
        .upsert({ name: name.trim(), email: email.trim().toLowerCase(), source: 'manual' as const }, { onConflict: 'email' })
        .select()
        .single()
      if (candErr) throw candErr

      // Create submission
      const { data: submission, error: subErr } = await supabase
        .from('submissions')
        .insert({ assessment_id: assessmentId, candidate_id: candidate.id, status: 'pending' as const, answers: {} })
        .select()
        .single()
      if (subErr) throw subErr

      const url = `${window.location.origin}/assess/${submission.token}`
      setGeneratedUrl(url)
      await navigator.clipboard.writeText(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invitation')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setName('')
    setEmail('')
    setGeneratedUrl('')
    setError('')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card anim-slide" onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 22, color: 'var(--navy)', marginBottom: 16 }}>✉️ Invite via Email</h2>

        {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 16px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {generatedUrl ? (
          <div style={{ background: 'var(--success-light)', padding: 16, borderRadius: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 6 }}>✓ Invitation created & link copied!</div>
            <input className="form-input" value={generatedUrl} readOnly onClick={e => (e.target as HTMLInputElement).select()} style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }} />
            <div style={{ fontSize: 11, color: 'var(--text-mut)', marginTop: 4 }}>Send this link to {name} at {email}</div>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">Assessment</label>
              <select className="form-select" value={assessmentId} onChange={e => setAssessmentId(e.target.value)}>
                {assessments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Candidate Name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={handleClose}>
            {generatedUrl ? 'Done' : 'Cancel'}
          </button>
          {!generatedUrl && (
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleSend} disabled={sending || !name.trim() || !email.trim()}>
              {sending ? 'Creating...' : 'Send Invitation'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
