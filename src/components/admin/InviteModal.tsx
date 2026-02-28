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
  const [emailSent, setEmailSent] = useState(false)

  if (!isOpen) return null

  const selectedTitle = assessments.find(a => a.id === assessmentId)?.title ?? 'Assessment'

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

      // Send email via API route
      try {
        const res = await fetch('/api/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateName: name.trim(),
            candidateEmail: email.trim().toLowerCase(),
            assessmentTitle: selectedTitle,
            assessUrl: url,
          }),
        })
        if (res.ok) {
          setEmailSent(true)
        }
      } catch {
        // Email failed but link was still created — that's ok
      }

      // Copy to clipboard as backup
      await navigator.clipboard.writeText(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invitation')
    } finally {
      setSending(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedUrl)
  }

  const handleClose = () => {
    setName('')
    setEmail('')
    setGeneratedUrl('')
    setError('')
    setEmailSent(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card anim-slide" onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 22, color: 'var(--navy)', marginBottom: 16 }}>Invite Candidate</h2>

        {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 16px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {generatedUrl ? (
          <div>
            {/* Success state */}
            <div style={{ background: 'var(--success-light)', padding: 16, borderRadius: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--success)', marginBottom: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                {emailSent ? `Email sent to ${email}` : 'Invitation created & link copied!'}
              </div>
              {emailSent && (
                <div style={{ fontSize: 12, color: 'var(--success)', opacity: 0.8 }}>
                  {name} will receive the assessment link in their inbox.
                </div>
              )}
            </div>

            {/* Link display */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mut)', marginBottom: 4, display: 'block' }}>Assessment Link</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" value={generatedUrl} readOnly onClick={e => (e.target as HTMLInputElement).select()} style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", flex: 1 }} />
                <button className="btn btn-secondary btn-sm" onClick={handleCopy} style={{ flexShrink: 0 }}>
                  Copy
                </button>
              </div>
            </div>

            {!emailSent && (
              <div style={{ fontSize: 11, color: 'var(--text-mut)', marginTop: 4 }}>
                Email could not be sent. Please share this link manually with {name}.
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">Assessment</label>
              <select className="form-select" value={assessmentId} onChange={e => setAssessmentId(e.target.value)}>
                {assessments.length === 0 && <option value="">No assessments available</option>}
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
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleSend} disabled={sending || !name.trim() || !email.trim() || !assessmentId}>
              {sending ? 'Sending...' : 'Send Invitation'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
