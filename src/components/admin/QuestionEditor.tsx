'use client'
import { useState, useRef } from 'react'
import { Question } from '@/lib/supabase'

type Props = {
  question: Question
  onChange: (q: Question) => void
  onRemove: () => void
  questionNumber: number
}

const typeLabels: Record<string, string> = {
  multiple_choice: 'Multiple Choice',
  fill_blank: 'Fill in the Blank',
  written: 'Written Response',
  ranking: 'Ranking',
}

export default function QuestionEditor({ question, onChange, onRemove, questionNumber }: Props) {
  const update = (partial: Partial<Question>) => onChange({ ...question, ...partial })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      update({ image_url: data.url })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ background: 'var(--cream)', border: '1px solid var(--border-light)', borderRadius: 14, padding: '20px 24px', marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Q{questionNumber} — {typeLabels[question.type] || question.type}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input className="form-input" type="number" value={question.points} onChange={e => update({ points: Number(e.target.value) })} style={{ width: 56, padding: '6px 8px', fontSize: 12, borderRadius: 8, textAlign: 'center' }} />
          <span style={{ fontSize: 11, color: 'var(--text-mut)' }}>pts</span>
          <input className="form-input" type="number" value={question.weight} step={0.1} onChange={e => update({ weight: Number(e.target.value) })} style={{ width: 56, padding: '6px 8px', fontSize: 12, borderRadius: 8, textAlign: 'center' }} />
          <span style={{ fontSize: 11, color: 'var(--text-mut)' }}>wt</span>
          <button onClick={onRemove} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--white)', color: 'var(--text-mut)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, transition: 'all .15s' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-light)'; e.currentTarget.style.color = 'var(--danger)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.color = 'var(--text-mut)'; }}>×</button>
        </div>
      </div>

      {/* Question text */}
      <div style={{ marginBottom: 12 }}>
        <textarea className="form-textarea" rows={2} value={question.text} onChange={e => update({ text: e.target.value })} placeholder="Enter question text..." />
      </div>

      {/* Image attachment */}
      <div style={{ marginBottom: 12 }}>
        {question.image_url ? (
          <div style={{ position: 'relative', display: 'inline-block', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={question.image_url} alt="Question image" style={{ maxWidth: '100%', maxHeight: 200, display: 'block', borderRadius: 10 }} />
            <button
              onClick={() => update({ image_url: undefined })}
              style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
            >×</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = '' }} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-mut)', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-mut)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              {uploading ? 'Uploading...' : 'Add Image'}
            </button>
          </div>
        )}
      </div>

      {/* Type-specific fields */}
      {question.type === 'multiple_choice' && (
        <div>
          <label className="form-label">Options <span style={{ fontWeight: 400, color: 'var(--text-mut)' }}>(click ● to mark correct)</span></label>
          {(question.options || []).map((opt, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div
                onClick={() => update({ correct: i })}
                style={{
                  width: 20, height: 20, borderRadius: '50%', border: `2px solid ${question.correct === i ? 'var(--success)' : 'var(--border)'}`,
                  background: question.correct === i ? 'var(--success)' : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s',
                  color: '#fff', fontSize: 11, fontWeight: 700,
                }}
              >{question.correct === i ? '✓' : ''}</div>
              <input className="form-input" type="text" value={opt} onChange={e => { const opts = [...(question.options || [])]; opts[i] = e.target.value; update({ options: opts }); }} style={{ flex: 1 }} />
              <button onClick={() => { const opts = [...(question.options || [])]; opts.splice(i, 1); const newCorrect = question.correct !== undefined && question.correct > i ? question.correct - 1 : question.correct; update({ options: opts, correct: newCorrect }); }} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--white)', color: 'var(--text-mut)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>×</button>
            </div>
          ))}
          <button onClick={() => update({ options: [...(question.options || []), ''] })} style={{ fontSize: 13, color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}>+ Add Option</button>
        </div>
      )}

      {question.type === 'fill_blank' && (
        <div>
          <label className="form-label">Accepted Answers <span style={{ fontWeight: 400, color: 'var(--text-mut)' }}>(comma-separated)</span></label>
          <input className="form-input" value={(question.accepted_answers || []).join(', ')} onChange={e => update({ accepted_answers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
        </div>
      )}

      {question.type === 'written' && (
        <div className="form-row">
          <div>
            <label className="form-label">Min Words</label>
            <input className="form-input" type="number" value={question.min_words || 50} onChange={e => update({ min_words: Number(e.target.value) })} />
          </div>
          <div>
            <label className="form-label">Max Words</label>
            <input className="form-input" type="number" value={question.max_words || 300} onChange={e => update({ max_words: Number(e.target.value) })} />
          </div>
        </div>
      )}

      {question.type === 'ranking' && (
        <div>
          <label className="form-label">Items (correct order)</label>
          <p className="form-hint" style={{ marginBottom: 10 }}>Items shown in correct order here. Candidates see them shuffled.</p>
          {(question.items || []).map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
              <input className="form-input" type="text" value={item} onChange={e => { const items = [...(question.items || [])]; items[i] = e.target.value; update({ items }); }} style={{ flex: 1 }} />
              <button onClick={() => { const items = [...(question.items || [])]; items.splice(i, 1); update({ items }); }} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--white)', color: 'var(--text-mut)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>×</button>
            </div>
          ))}
          <button onClick={() => update({ items: [...(question.items || []), ''] })} style={{ fontSize: 13, color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}>+ Add Item</button>
        </div>
      )}
    </div>
  )
}
