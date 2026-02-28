'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type Assessment, type Section } from '@/lib/supabase'

/* ---------- types ---------- */
type AssessmentWithProject = Assessment & { projects: { name: string } | null }

/* ---------- fallback seed data ---------- */
const FALLBACK: AssessmentWithProject[] = [
  {
    id: '1', title: 'English Proficiency Assessment', description: null, type: 'scoring', status: 'active',
    project_id: 'p1', role: 'Project Manager', time_limit: 30, pass_threshold: 70,
    sections: [{ title: 'Section 1', questions: [
      { id: 'q1', type: 'multiple_choice', text: '', points: 10, weight: 1 },
      { id: 'q2', type: 'fill_blank', text: '', points: 10, weight: 1 },
      { id: 'q3', type: 'written', text: '', points: 10, weight: 1 },
      { id: 'q4', type: 'ranking', text: '', points: 10, weight: 1 },
    ] }],
    created_at: '', updated_at: '', projects: { name: 'Client Onboarding' }, _sent: 142, _avg: 72,
  },
  {
    id: '2', title: 'Cultural Fit Interview', description: null, type: 'open', status: 'active',
    project_id: 'p2', role: 'General', time_limit: 20, pass_threshold: null,
    sections: [{ title: 'Section 1', questions: [
      { id: 'q1', type: 'written', text: '', points: 10, weight: 1 },
      { id: 'q2', type: 'written', text: '', points: 10, weight: 1 },
      { id: 'q3', type: 'written', text: '', points: 10, weight: 1 },
    ] }],
    created_at: '', updated_at: '', projects: { name: 'Talent Pipeline' }, _sent: 68, _avg: null,
  },
  {
    id: '3', title: 'Technical Assessment', description: null, type: 'scoring', status: 'draft',
    project_id: 'p1', role: 'Developer', time_limit: 45, pass_threshold: 60,
    sections: [
      { title: 'Section 1', questions: [
        { id: 'q1', type: 'multiple_choice', text: '', points: 10, weight: 1 },
        { id: 'q2', type: 'multiple_choice', text: '', points: 10, weight: 1 },
        { id: 'q3', type: 'fill_blank', text: '', points: 10, weight: 1 },
      ] },
      { title: 'Section 2', questions: [
        { id: 'q4', type: 'written', text: '', points: 10, weight: 1 },
        { id: 'q5', type: 'ranking', text: '', points: 10, weight: 1 },
        { id: 'q6', type: 'multiple_choice', text: '', points: 10, weight: 1 },
      ] },
    ],
    created_at: '', updated_at: '', projects: { name: 'Client Onboarding' }, _sent: 0, _avg: null,
  },
] as unknown as AssessmentWithProject[]

/* ---------- helpers ---------- */
function countQuestions(sections: Section[] | unknown): number {
  if (!Array.isArray(sections)) {
    try {
      const parsed = typeof sections === 'string' ? JSON.parse(sections) : sections
      if (!Array.isArray(parsed)) return 0
      return parsed.reduce((sum: number, s: Section) => sum + (s.questions?.length ?? 0), 0)
    } catch { return 0 }
  }
  return sections.reduce((sum, s) => sum + (s.questions?.length ?? 0), 0)
}

/* ---------- component ---------- */
export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [stats, setStats] = useState<Record<string, { sent: number; avg: number | null }>>({})

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from('assessments').select('*, projects(name)')
        if (error || !data || data.length === 0) throw error
        setAssessments(data as AssessmentWithProject[])

        const statMap: Record<string, { sent: number; avg: number | null }> = {}
        for (const a of data) {
          const { data: subs } = await supabase.from('submissions').select('score').eq('assessment_id', a.id)
          const sent = subs?.length ?? 0
          const scores = subs?.map(s => s.score).filter((s): s is number => s !== null) ?? []
          const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
          statMap[a.id] = { sent, avg }
        }
        setStats(statMap)
      } catch {
        setAssessments(FALLBACK)
        setStats({ '1': { sent: 142, avg: 72 }, '2': { sent: 68, avg: null }, '3': { sent: 0, avg: null } })
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const projectNames = [...new Set(assessments.map(a => a.projects?.name).filter(Boolean))] as string[]

  const filtered = assessments.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (typeFilter !== 'all' && a.type !== typeFilter) return false
    if (projectFilter !== 'all' && a.projects?.name !== projectFilter) return false
    return true
  })

  function handleCopy(e: React.MouseEvent, id: string) {
    e.preventDefault(); e.stopPropagation()
    navigator.clipboard.writeText(`${window.location.origin}/assess/${id}`)
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Delete this assessment?')) return
    try { await supabase.from('assessments').delete().eq('id', id) } catch { /* ok */ }
    setAssessments(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="anim-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, color: 'var(--navy)', marginBottom: 4 }}>Assessments</h1>
          <p style={{ fontSize: 14, color: 'var(--text-mut)' }}>Create and manage candidate assessments</p>
        </div>
        <Link href="/admin/assessments/new" className="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Assessment
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select className="form-select" style={{ width: 'auto', minWidth: 130, padding: '8px 36px 8px 14px', fontSize: 13 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select className="form-select" style={{ width: 'auto', minWidth: 120, padding: '8px 36px 8px 14px', fontSize: 13 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="scoring">Scoring</option>
          <option value="open">Open</option>
        </select>
        <select className="form-select" style={{ width: 'auto', minWidth: 130, padding: '8px 36px 8px 14px', fontSize: 13 }} value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
          <option value="all">All Projects</option>
          {projectNames.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-mut)', fontSize: 14 }}>Loading assessments...</div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-mut)', fontSize: 14 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>
          No assessments found.
        </div>
      )}

      {/* Assessment list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(a => {
          const qCount = countQuestions(a.sections)
          const st = stats[a.id] ?? { sent: 0, avg: null }

          return (
            <Link key={a.id} href={`/admin/assessments/${a.id}/edit`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(6,5,52,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                {/* Icon */}
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--tusk)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📝</div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-mut)', marginTop: 2 }}>{a.role ?? '—'} · {qCount} question{qCount !== 1 ? 's' : ''} · {a.projects?.name ?? '—'}</div>
                </div>

                {/* Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                  <span className={`pill ${a.type === 'scoring' ? 'pill-blue' : 'pill-purple'}`}>{a.type === 'scoring' ? 'Scoring' : 'Open'}</span>
                  <span className={`pill ${a.status === 'active' ? 'pill-success' : a.status === 'draft' ? 'pill-accent' : 'pill-navy'}`}>
                    {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                  </span>
                  <span className="pill" style={{ background: 'var(--navy)', color: '#fff' }}>{st.sent} sent</span>
                  {st.avg !== null && <span className="pill pill-blue">{st.avg}% avg</span>}

                  {/* Copy */}
                  <button onClick={e => handleCopy(e, a.id)} title="Copy link"
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--white)', color: 'var(--text-mut)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--navy)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mut)'; e.currentTarget.style.borderColor = 'var(--border-light)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                  </button>

                  {/* Delete */}
                  <button onClick={e => handleDelete(e, a.id)} title="Delete"
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--white)', color: 'var(--text-mut)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mut)'; e.currentTarget.style.borderColor = 'var(--border-light)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>
                  </button>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
