'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured, Assessment, Section, Question } from '@/lib/supabase'
import QuestionEditor from './QuestionEditor'

type Props = { existingAssessment?: Assessment }

const questionTypeOptions = [
  { value: 'multiple_choice', label: 'Multiple Choice', icon: '☑', desc: 'Auto-scored' },
  { value: 'fill_blank', label: 'Fill in Blank', icon: '✏️', desc: 'Auto-scored' },
  { value: 'written', label: 'Written Response', icon: '📝', desc: 'AI-scored' },
  { value: 'ranking', label: 'Ranking', icon: '↕️', desc: 'Partial credit' },
]

function makeId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

function newQuestion(type: Question['type']): Question {
  const base: Question = { id: makeId(), type, text: '', points: 10, weight: 1.0 }
  if (type === 'multiple_choice') return { ...base, options: ['', ''], correct: 0 }
  if (type === 'fill_blank') return { ...base, accepted_answers: [] }
  if (type === 'written') return { ...base, min_words: 50, max_words: 300, points: 20 }
  if (type === 'ranking') return { ...base, items: ['', ''] }
  return base
}

export default function AssessmentBuilder({ existingAssessment }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(existingAssessment?.title ?? '')
  const [type, setType] = useState<'scoring' | 'open'>(existingAssessment?.type ?? 'scoring')
  const [description, setDescription] = useState(existingAssessment?.description ?? '')
  const [projectId, setProjectId] = useState(existingAssessment?.project_id ?? '')
  const [role, setRole] = useState(existingAssessment?.role ?? '')
  const [status, setStatus] = useState(existingAssessment?.status ?? 'draft')
  const [timeLimit, setTimeLimit] = useState(existingAssessment?.time_limit ?? 20)
  const [passThreshold, setPassThreshold] = useState(existingAssessment?.pass_threshold ?? 70)
  const [sections, setSections] = useState<Section[]>(() => {
    if (existingAssessment?.sections) {
      const s = existingAssessment.sections
      return Array.isArray(s) ? s : JSON.parse(s as unknown as string)
    }
    return [{ title: 'Section 1', questions: [] }]
  })
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [addingTo, setAddingTo] = useState<number | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.from('projects').select('id, name').then(({ data }) => {
      if (data) setProjects(data)
    })
  }, [])

  const totalQuestions = sections.reduce((s, sec) => s + sec.questions.length, 0)
  const totalPoints = sections.reduce((s, sec) => s + sec.questions.reduce((qs, q) => qs + (q.points * q.weight), 0), 0)

  const handleSave = async () => {
    if (!title.trim()) return alert('Please enter a title')
    setSaving(true)
    const payload = {
      title, description: description || null, type, status,
      project_id: projectId || null,
      role: role || null,
      time_limit: timeLimit,
      pass_threshold: type === 'scoring' ? passThreshold : null,
      sections,
    }
    try {
      if (isSupabaseConfigured) {
        if (existingAssessment) {
          await supabase.from('assessments').update(payload).eq('id', existingAssessment.id)
        } else {
          await supabase.from('assessments').insert(payload)
        }
      }
      router.push('/admin/assessments')
    } catch (err) {
      console.error(err)
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const updateSection = (idx: number, partial: Partial<Section>) => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, ...partial } : s))
  }

  const removeSection = (idx: number) => {
    if (!confirm('Remove this section and all its questions?')) return
    setSections(prev => prev.filter((_, i) => i !== idx))
  }

  const addQuestion = (sectionIdx: number, qType: Question['type']) => {
    setSections(prev => prev.map((s, i) => i === sectionIdx ? { ...s, questions: [...s.questions, newQuestion(qType)] } : s))
    setAddingTo(null)
  }

  const updateQuestion = (sectionIdx: number, qIdx: number, q: Question) => {
    setSections(prev => prev.map((s, si) => si === sectionIdx ? { ...s, questions: s.questions.map((qq, qi) => qi === qIdx ? q : qq) } : s))
  }

  const removeQuestion = (sectionIdx: number, qIdx: number) => {
    setSections(prev => prev.map((s, si) => si === sectionIdx ? { ...s, questions: s.questions.filter((_, qi) => qi !== qIdx) } : s))
  }

  let qNum = 0

  return (
    <div>
      {/* Top actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.push('/admin/assessments')}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Left column */}
        <div>
          {/* Settings card */}
          <div className="card card-pad" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 20 }}>Assessment Settings</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Assessment title" />
              </div>
              <div className="form-group">
                <label className="form-label">Test Type</label>
                <select className="form-select" value={type} onChange={e => setType(e.target.value as 'scoring' | 'open')}>
                  <option value="scoring">Scoring (has pass/fail)</option>
                  <option value="open">Open (no score)</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Project</label>
                <select className="form-select" value={projectId} onChange={e => setProjectId(e.target.value)}>
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input className="form-input" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Project Manager" />
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Time Limit (min)</label>
                <input className="form-input" type="number" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Pass Threshold (%)</label>
                <input className="form-input" type="number" value={passThreshold} onChange={e => setPassThreshold(Number(e.target.value))} disabled={type !== 'scoring'} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={status} onChange={e => setStatus(e.target.value as 'active' | 'draft' | 'archived')}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sections */}
          {sections.map((section, si) => (
            <div key={si} className="card" style={{ marginBottom: 16 }}>
              <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="pill pill-navy">Section {si + 1}</span>
                  <input className="form-input" style={{ maxWidth: 280, padding: '8px 12px', fontSize: 14, fontWeight: 600 }} value={section.title} onChange={e => updateSection(si, { title: e.target.value })} />
                </div>
                {sections.length > 1 && (
                  <button onClick={() => removeSection(si)} style={{ fontSize: 13, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                )}
              </div>
              <div style={{ padding: '16px 24px' }}>
                {section.questions.map((q, qi) => {
                  qNum++
                  return (
                    <QuestionEditor
                      key={q.id}
                      question={q}
                      onChange={updated => updateQuestion(si, qi, updated)}
                      onRemove={() => removeQuestion(si, qi)}
                      questionNumber={qNum}
                    />
                  )
                })}

                {/* Add question */}
                {addingTo === si ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 16, border: '2px solid var(--border-light)', borderRadius: 14 }}>
                    {questionTypeOptions.map(qt => (
                      <button key={qt.value} onClick={() => addQuestion(si, qt.value as Question['type'])} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--cream)', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, textAlign: 'left', transition: 'all .15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--tusk)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--cream)'}>
                        <span style={{ fontSize: 18 }}>{qt.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{qt.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-mut)' }}>{qt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div onClick={() => setAddingTo(si)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, border: '2px dashed var(--border)', borderRadius: 14, cursor: 'pointer', color: 'var(--text-mut)', fontSize: 14, fontWeight: 500, transition: 'all .15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)'; e.currentTarget.style.background = 'var(--tusk)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-mut)'; e.currentTarget.style.background = 'transparent'; }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add Question
                  </div>
                )}
              </div>
            </div>
          ))}

          <button className="btn btn-secondary" onClick={() => setSections(prev => [...prev, { title: `Section ${prev.length + 1}`, questions: [] }])}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Section
          </button>
        </div>

        {/* Right sidebar */}
        <div style={{ position: 'sticky', top: 0 }}>
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, color: 'var(--navy)', marginBottom: 16 }}>Summary</h3>
            <div style={{ fontSize: 14, color: 'var(--text-sec)', lineHeight: 2 }}>
              <div>Sections: <strong style={{ color: 'var(--navy)' }}>{sections.length}</strong></div>
              <div>Questions: <strong style={{ color: 'var(--navy)' }}>{totalQuestions}</strong></div>
              <div>Total Points: <strong style={{ color: 'var(--navy)' }}>{Math.round(totalPoints)}</strong></div>
              <div>Time: <strong style={{ color: 'var(--navy)' }}>{timeLimit} min</strong></div>
              {type === 'scoring' && <div>Threshold: <strong style={{ color: 'var(--navy)' }}>{passThreshold}%</strong></div>}
            </div>
          </div>
          <div className="card card-pad">
            <h3 style={{ fontSize: 16, color: 'var(--navy)', marginBottom: 12 }}>Question Types</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {questionTypeOptions.map(t => (
                <div key={t.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--cream)', borderRadius: 10 }}>
                  <span style={{ fontSize: 18 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-mut)' }}>{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
