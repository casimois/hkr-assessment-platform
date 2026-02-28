'use client'
import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

type Props = {
  isOpen: boolean
  onClose: () => void
  assessments: { id: string; title: string }[]
}

export default function GenerateLinkModal({ isOpen, onClose, assessments }: Props) {
  const [assessmentId, setAssessmentId] = useState(assessments[0]?.id || '')

  // Sync assessmentId when assessments load asynchronously
  useEffect(() => {
    if (!assessmentId && assessments.length > 0) {
      setAssessmentId(assessments[0].id)
    }
  }, [assessments, assessmentId])
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleGenerate = async () => {
    if (!assessmentId) return
    setGenerating(true)
    setError('')
    try {
      if (!isSupabaseConfigured) throw new Error('Supabase not configured')

      // Create an anonymous candidate placeholder
      const { data: candidate, error: candErr } = await supabase
        .from('candidates')
        .insert({ name: 'Anonymous', email: `link-${Date.now()}@generated.link`, source: 'link' as const })
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
      setError(err instanceof Error ? err.message : 'Failed to generate link')
    } finally {
      setGenerating(false)
    }
  }

  const handleClose = () => {
    setGeneratedUrl('')
    setError('')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card anim-slide" onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 22, color: 'var(--navy)', marginBottom: 16 }}>Generate Assessment Link</h2>

        {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 16px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {generatedUrl ? (
          <div style={{ background: 'var(--success-light)', padding: 16, borderRadius: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 6 }}>Link generated & copied!</div>
            <input className="form-input" value={generatedUrl} readOnly onClick={e => (e.target as HTMLInputElement).select()} style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }} />
            <div style={{ fontSize: 11, color: 'var(--text-mut)', marginTop: 4 }}>Share this link with any candidate. They will identify themselves before starting.</div>
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">Assessment</label>
            <select className="form-select" value={assessmentId} onChange={e => setAssessmentId(e.target.value)}>
              {assessments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
            <div className="form-hint">A unique link will be generated for one candidate to take this assessment.</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={handleClose}>
            {generatedUrl ? 'Done' : 'Cancel'}
          </button>
          {!generatedUrl && (
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleGenerate} disabled={generating || !assessmentId}>
              {generating ? 'Generating...' : 'Generate Link'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
