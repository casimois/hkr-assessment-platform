'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured, Assessment, Section, Question } from '@/lib/supabase'
import { countPoolable, selectQuestionsForSubmission } from '@/lib/question-pool'
import { useAuth } from '@/lib/auth'
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
  const { profile } = useAuth()
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
  const [tryingTest, setTryingTest] = useState(false)
  const [addingTo, setAddingTo] = useState<number | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.from('projects').select('id, name').then(({ data }) => {
      if (data) setProjects(data)
    })
  }, [])

  const totalQuestions = sections.reduce((s, sec) => s + sec.questions.length, 0)
  const totalPoints = sections.reduce((s, sec) => s + sec.questions.reduce((qs, q) => qs + (q.points * q.weight), 0), 0)

  const validateAssessment = (): string[] => {
    const errors: string[] = []
    if (!title.trim()) errors.push('Assessment title is required.')
    if (timeLimit < 1) errors.push('Time limit must be at least 1 minute.')
    if (type === 'scoring' && (passThreshold < 0 || passThreshold > 100)) errors.push('Pass threshold must be 0–100.')

    if (sections.length === 0) {
      errors.push('Add at least one section.')
    }

    let qGlobal = 0
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si]
      if (!sec.title.trim()) errors.push(`Section ${si + 1}: Title is required.`)
      if (sec.questions.length === 0) errors.push(`Section "${sec.title || si + 1}": Add at least one question.`)

      for (let qi = 0; qi < sec.questions.length; qi++) {
        qGlobal++
        const q = sec.questions[qi]
        const label = `Q${qGlobal} (${sec.title || `Section ${si + 1}`})`

        if (!q.text.trim()) errors.push(`${label}: Question text is required.`)
        if (q.points < 0) errors.push(`${label}: Points cannot be negative.`)

        if (q.type === 'multiple_choice') {
          const opts = (q.options || []).filter(o => o.trim() !== '')
          if (opts.length < 2) errors.push(`${label}: Multiple choice needs at least 2 non-empty options.`)
          if (q.correct === undefined || q.correct === null) {
            errors.push(`${label}: Select a correct answer.`)
          } else if (q.correct < 0 || q.correct >= (q.options || []).length) {
            errors.push(`${label}: Correct answer index is out of range.`)
          }
        }

        if (q.type === 'fill_blank') {
          if (!q.accepted_answers || q.accepted_answers.filter(a => a.trim() !== '').length === 0) {
            errors.push(`${label}: Fill in the blank needs at least 1 accepted answer.`)
          }
        }

        if (q.type === 'ranking') {
          const items = (q.items || []).filter(it => it.trim() !== '')
          if (items.length < 2) errors.push(`${label}: Ranking needs at least 2 non-empty items.`)
        }

        if (q.type === 'written') {
          if (q.min_words && q.max_words && q.min_words > q.max_words) {
            errors.push(`${label}: Min words cannot exceed max words.`)
          }
        }
      }
    }

    return errors
  }

  const handleSave = async () => {
    const errors = validateAssessment()
    if (errors.length > 0) {
      setValidationErrors(errors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setValidationErrors([])
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

  const handleTryMyself = async () => {
    if (!existingAssessment || !isSupabaseConfigured || !profile) return
    const errors = validateAssessment()
    if (errors.length > 0) {
      setValidationErrors(errors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setTryingTest(true)
    try {
      // Upsert a candidate record for the current admin user
      const { data: candidate, error: candErr } = await supabase
        .from('candidates')
        .upsert({ name: profile.full_name || 'Admin', email: profile.email, source: 'manual' as const }, { onConflict: 'email' })
        .select()
        .single()
      if (candErr) throw candErr

      // Select random questions if pooling is configured
      const selectedSections = selectQuestionsForSubmission(sections)

      // Create a submission
      const { data: submission, error: subErr } = await supabase
        .from('submissions')
        .insert({
          assessment_id: existingAssessment.id,
          candidate_id: candidate.id,
          status: 'pending' as const,
          answers: {},
          selected_sections: selectedSections as unknown as Record<string, unknown>,
        })
        .select()
        .single()
      if (subErr) throw subErr

      // Open the assessment link in a new tab
      window.open(`/assess/${submission.token}`, '_blank')
    } catch (err) {
      console.error('Try myself error:', err)
      alert('Failed to generate test link. Make sure the assessment is saved first.')
    } finally {
      setTryingTest(false)
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
        {existingAssessment && (
          <button className="btn btn-secondary btn-sm" onClick={handleTryMyself} disabled={tryingTest} title="Take this assessment yourself in a new tab">
            {tryingTest ? 'Generating...' : 'Try it myself'}
          </button>
        )}
        <button className="btn btn-secondary btn-sm" onClick={() => router.push('/admin/assessments')}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save'}
        </button>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger)' }}>Please fix the following issues before saving:</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--danger)', lineHeight: 1.8 }}>
            {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

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
            <div className={type === 'scoring' ? 'form-row-3' : 'form-row'}>
              <div className="form-group">
                <label className="form-label">Time Limit (min)</label>
                <input className="form-input" type="number" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} />
              </div>
              {type === 'scoring' && (
                <div className="form-group">
                  <label className="form-label">Pass Threshold (%)</label>
                  <input className="form-input" type="number" value={passThreshold} onChange={e => setPassThreshold(Number(e.target.value))} />
                </div>
              )}
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
              <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="pill pill-navy">Section {si + 1}</span>
                  <input className="form-input" style={{ maxWidth: 280, padding: '8px 12px', fontSize: 14, fontWeight: 600 }} value={section.title} onChange={e => updateSection(si, { title: e.target.value })} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {(() => {
                    const poolableCount = countPoolable(section)
                    if (poolableCount < 2) return null
                    const isOn = section.randomize === true
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: isOn ? 'var(--accent-light)' : 'var(--cream)', borderRadius: 8, padding: '6px 12px', transition: 'background 0.15s' }}>
                        {/* Toggle */}
                        <div
                          onClick={() => updateSection(si, {
                            randomize: !isOn,
                            pool_size: !isOn ? Math.min(5, poolableCount) : undefined,
                          })}
                          style={{ width: 36, height: 20, borderRadius: 10, background: isOn ? 'var(--accent)' : 'var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                        >
                          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: isOn ? 18 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isOn ? 'var(--accent)' : 'var(--text-mut)'} strokeWidth="2" strokeLinecap="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>
                        {isOn ? (
                          <>
                            <span style={{ fontSize: 12, color: 'var(--text-sec)', whiteSpace: 'nowrap' }}>Show</span>
                            <input
                              type="number"
                              min={1}
                              max={poolableCount}
                              value={section.pool_size ?? poolableCount}
                              onChange={e => {
                                const val = parseInt(e.target.value) || poolableCount
                                updateSection(si, { pool_size: Math.min(val, poolableCount) })
                              }}
                              style={{ width: 48, padding: '4px 6px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: 13, fontWeight: 600, textAlign: 'center', color: 'var(--navy)' }}
                            />
                            <span style={{ fontSize: 12, color: 'var(--text-sec)', whiteSpace: 'nowrap' }}>of {poolableCount} MC/Fill per candidate</span>
                          </>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-mut)', whiteSpace: 'nowrap' }}>Randomize MC/Fill</span>
                        )}
                      </div>
                    )
                  })()}
                  {sections.length > 1 && (
                    <button onClick={() => removeSection(si)} style={{ fontSize: 13, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                  )}
                </div>
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
            {(() => {
              const randomizedSections = sections.filter(s => s.randomize && s.pool_size !== undefined)
              const candidateQuestions = sections.reduce((sum, s) => {
                if (!s.randomize || s.pool_size === undefined) return sum + s.questions.length
                const poolableCount = countPoolable(s)
                const fixedCount = s.questions.length - poolableCount
                const selectedPoolable = Math.min(s.pool_size, poolableCount)
                return sum + fixedCount + selectedPoolable
              }, 0)
              return (
                <div style={{ fontSize: 14, color: 'var(--text-sec)', lineHeight: 2 }}>
                  <div>Sections: <strong style={{ color: 'var(--navy)' }}>{sections.length}</strong></div>
                  <div>Total questions: <strong style={{ color: 'var(--navy)' }}>{totalQuestions}</strong></div>
                  {randomizedSections.length > 0 && (
                    <div>Per candidate: <strong style={{ color: 'var(--accent)' }}>{candidateQuestions}</strong> <span style={{ fontSize: 11 }}>(MC/Fill randomized)</span></div>
                  )}
                  <div>Total Points: <strong style={{ color: 'var(--navy)' }}>{Math.round(totalPoints)}</strong></div>
                  <div>Time: <strong style={{ color: 'var(--navy)' }}>{timeLimit} min</strong></div>
                  {type === 'scoring' && <div>Threshold: <strong style={{ color: 'var(--navy)' }}>{passThreshold}%</strong></div>}
                </div>
              )
            })()}
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
