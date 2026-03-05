'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { getAccessibleProjectIds } from '@/lib/access'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TopStats {
  activeAssessments: number
  totalAssessments: number
  draftCount: number
  uniqueCandidates: number
  newCandidatesThisWeek: number
  completionRate: number
  totalSent: number
  completedCount: number
  pendingReviews: number
}

interface AssessmentCardData {
  id: string
  title: string
  type: 'scoring' | 'open'
  status: 'active' | 'draft' | 'archived'
  role: string | null
  projectName: string | null
  projectId: string | null
  sent: number
  completed: number
  avgScore: number | null
  passRate: number | null
  reviewedCount: number | null
  pendingReviewCount: number | null
}

interface ActivityItem {
  id: string
  initials: string
  name: string
  quiz: string
  date: string
  status: 'passed' | 'completed' | 'failed' | 'in_progress'
  score?: string
}

type GroupBy = 'none' | 'project' | 'status'

const EMPTY_STATS: TopStats = {
  activeAssessments: 0,
  totalAssessments: 0,
  draftCount: 0,
  uniqueCandidates: 0,
  newCandidatesThisWeek: 0,
  completionRate: 0,
  totalSent: 0,
  completedCount: 0,
  pendingReviews: 0,
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { profile } = useAuth()
  const [topStats, setTopStats] = useState<TopStats>(EMPTY_STATS)
  const [cards, setCards] = useState<AssessmentCardData[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        if (!isSupabaseConfigured) { setLoading(false); return }

        // 1. Fetch projects for scoping
        const { data: projects } = await supabase.from('projects').select('*')
        const accessibleIds = getAccessibleProjectIds(projects ?? [], profile)

        // 2. Fetch all assessments with project name
        const { data: rawAssessments } = await supabase
          .from('assessments')
          .select('*, projects(name)')

        // 3. Fetch all submissions with candidates
        const { data: rawSubmissions } = await supabase
          .from('submissions')
          .select('*, candidates(name, email), assessments(type, sections, project_id)')
          .order('created_at', { ascending: false })

        // 4. Apply role-based scoping
        const isUserRole = profile?.role === 'user'
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const allAssessments = (rawAssessments ?? []) as any[]
        const allSubmissions = (rawSubmissions ?? []) as any[]

        const filteredAssessments = isUserRole
          ? allAssessments.filter(a => a.project_id && accessibleIds.includes(a.project_id))
          : allAssessments
        const filteredSubmissions = isUserRole
          ? allSubmissions.filter(s => {
              const a = s.assessments
              return a?.project_id && accessibleIds.includes(a.project_id)
            })
          : allSubmissions
        /* eslint-enable @typescript-eslint/no-explicit-any */

        // 5. Compute top-level stats
        const activeCount = filteredAssessments.filter(a => a.status === 'active').length
        const draftCount = filteredAssessments.filter(a => a.status === 'draft').length
        const candidateIds = new Set(filteredSubmissions.map(s => s.candidate_id))
        const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        const newThisWeek = new Set(
          filteredSubmissions
            .filter(s => new Date(s.created_at) >= oneWeekAgo)
            .map(s => s.candidate_id)
        ).size
        const totalSent = filteredSubmissions.length
        const completedCount = filteredSubmissions.filter(s => s.status === 'completed').length
        const completionRate = totalSent > 0 ? Math.round((completedCount / totalSent) * 100) : 0

        // Pending reviews: open-type completed submissions with ungraded written questions
        let pendingReviews = 0
        filteredSubmissions.forEach(s => {
          if (s.status !== 'completed') return
          const assess = s.assessments
          if (assess?.type !== 'open') return
          const manualScores = s.answers?.__manual_scores ?? {}
          const sections = Array.isArray(assess.sections) ? assess.sections : []
          const writtenQs = sections.flatMap((sec: { questions: { type: string; id: string }[] }) =>
            (sec.questions ?? []).filter(q => q.type === 'written')
          )
          if (writtenQs.length === 0) {
            // No written questions — count as reviewed if completed
            return
          }
          const allGraded = writtenQs.every((q: { id: string }) => manualScores[q.id] !== undefined)
          if (!allGraded) pendingReviews++
        })

        setTopStats({
          activeAssessments: activeCount,
          totalAssessments: filteredAssessments.length,
          draftCount,
          uniqueCandidates: candidateIds.size,
          newCandidatesThisWeek: newThisWeek,
          completionRate,
          totalSent,
          completedCount,
          pendingReviews,
        })

        // 6. Compute per-assessment card data
        const cardData: AssessmentCardData[] = filteredAssessments.map(a => {
          const subs = filteredSubmissions.filter(s => s.assessment_id === a.id)
          const completedSubs = subs.filter(s => s.status === 'completed')
          const scoredSubs = completedSubs.filter(s => s.score !== null && s.score !== undefined)
          const passedSubs = completedSubs.filter(s => s.passed === true)

          // For open type: count reviewed (all written questions graded)
          let reviewedCount: number | null = null
          let pendingReviewCount: number | null = null
          if (a.type === 'open') {
            const sections = Array.isArray(a.sections) ? a.sections : []
            const writtenQs = sections.flatMap((sec: { questions: { type: string; id: string }[] }) =>
              (sec.questions ?? []).filter(q => q.type === 'written')
            )
            let reviewed = 0
            completedSubs.forEach(s => {
              const ms = s.answers?.__manual_scores ?? {}
              if (writtenQs.length === 0 || writtenQs.every((q: { id: string }) => ms[q.id] !== undefined)) {
                reviewed++
              }
            })
            reviewedCount = reviewed
            pendingReviewCount = completedSubs.length - reviewed
          }

          return {
            id: a.id,
            title: a.title,
            type: a.type as 'scoring' | 'open',
            status: a.status as 'active' | 'draft' | 'archived',
            role: a.role,
            projectName: a.projects?.name ?? null,
            projectId: a.project_id,
            sent: subs.length,
            completed: completedSubs.length,
            avgScore: a.type === 'scoring' && scoredSubs.length > 0
              ? Math.round(scoredSubs.reduce((sum, s) => sum + (s.score ?? 0), 0) / scoredSubs.length)
              : null,
            passRate: a.type === 'scoring' && completedSubs.length > 0
              ? Math.round((passedSubs.length / completedSubs.length) * 100)
              : null,
            reviewedCount,
            pendingReviewCount,
          }
        })

        setCards(cardData)

        // 7. Recent activity (last 5 submissions)
        const recentActivity: ActivityItem[] = filteredSubmissions.slice(0, 5).map(s => {
          const cand = s.candidates
          const name = cand?.name ?? 'Unknown'
          const initials = name.split(' ').map((w: string) => w[0]?.toUpperCase()).join('').slice(0, 2)
          let status: ActivityItem['status'] = 'in_progress'
          if (s.status === 'completed') {
            status = s.passed === true ? 'passed' : s.passed === false ? 'failed' : 'completed'
          }
          // Find assessment title
          const assess = filteredAssessments.find(a => a.id === s.assessment_id)
          return {
            id: s.id,
            initials,
            name,
            quiz: assess?.title ?? '',
            date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
            status,
            score: s.score != null ? `${s.score}%` : undefined,
          }
        })

        setActivity(recentActivity)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [profile])

  /* ---------------------------------------------------------------- */
  /*  Filtering & grouping                                             */
  /* ---------------------------------------------------------------- */

  const filteredCards = cards.filter(c => {
    if (typeFilter !== 'all' && c.type !== typeFilter) return false
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    return true
  })

  const sortedCards = [...filteredCards].sort((a, b) => {
    const order: Record<string, number> = { active: 0, draft: 1, archived: 2 }
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
    if (b.sent !== a.sent) return b.sent - a.sent
    return a.title.localeCompare(b.title)
  })

  function getGroupedCards(): Map<string, AssessmentCardData[]> {
    const grouped = new Map<string, AssessmentCardData[]>()
    if (groupBy === 'project') {
      for (const card of sortedCards) {
        const key = card.projectName ?? 'No Project'
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key)!.push(card)
      }
    } else if (groupBy === 'status') {
      for (const card of sortedCards) {
        const key = card.status.charAt(0).toUpperCase() + card.status.slice(1)
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key)!.push(card)
      }
    } else {
      grouped.set('', sortedCards)
    }
    return grouped
  }

  const grouped = getGroupedCards()

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  function statusPill(status: ActivityItem['status'], score?: string) {
    const config: Record<ActivityItem['status'], { cls: string; label: string }> = {
      passed:      { cls: 'pill pill-success', label: `Passed ${score ?? ''}`.trim() },
      completed:   { cls: 'pill pill-success',  label: 'Completed' },
      failed:      { cls: 'pill pill-danger',  label: `Failed ${score ?? ''}`.trim() },
      in_progress: { cls: 'pill pill-accent',  label: 'In Progress' },
    }
    const c = config[status]
    return <span className={c.cls}>{c.label}</span>
  }

  function assessmentStatusPill(status: string) {
    if (status === 'active') return <span className="pill pill-success">Active</span>
    if (status === 'draft') return <span className="pill pill-accent">Draft</span>
    return <span className="pill pill-navy">Archived</span>
  }

  function typePill(type: string) {
    if (type === 'scoring') return <span className="pill pill-navy">Scoring</span>
    return <span className="pill pill-navy">Open</span>
  }

  function completionColor(rate: number): string {
    if (rate >= 80) return 'var(--success)'
    if (rate >= 50) return 'var(--accent)'
    return 'var(--danger)'
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="anim-up">
      {/* Spacer (title is in topbar) */}

      {/* ═══ Top Stats Row ═══ */}
      <div className="stats-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card card-pad">
                <div className="skeleton" style={{ width: 90, height: 12, marginBottom: 12 }} />
                <div className="skeleton" style={{ width: 50, height: 32, marginBottom: 10 }} />
                <div className="skeleton" style={{ width: 110, height: 10 }} />
              </div>
            ))
          : [
              { label: 'Active Assessments', value: String(topStats.activeAssessments), subtitle: `${topStats.totalAssessments} total${topStats.draftCount > 0 ? ` (${topStats.draftCount} draft${topStats.draftCount !== 1 ? 's' : ''})` : ''}` },
              { label: 'Total Candidates', value: String(topStats.uniqueCandidates), subtitle: topStats.newCandidatesThisWeek > 0 ? `${topStats.newCandidatesThisWeek} new this week` : 'All time' },
              { label: 'Completion Rate', value: `${topStats.completionRate}%`, subtitle: `${topStats.completedCount} of ${topStats.totalSent} completed` },
              { label: 'Pending Review', value: String(topStats.pendingReviews), subtitle: topStats.pendingReviews > 0 ? `${topStats.pendingReviews} need grading` : 'All caught up' },
            ].map((s, i) => (
              <div key={i} className="card card-pad" style={{ transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(6,5,52,0.06)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-mut)', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 400, color: 'var(--navy)', lineHeight: 1.1, marginBottom: 6 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-mut)' }}>{s.subtitle}</div>
              </div>
            ))}
      </div>

      {/* ═══ Filter Bar ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--navy)', marginRight: 'auto' }}>Assessments</div>
        <select
          className="form-select"
          value={groupBy}
          onChange={e => setGroupBy(e.target.value as GroupBy)}
          style={{ width: 'auto', padding: '8px 36px 8px 14px', fontSize: 13, borderRadius: 8 }}
        >
          <option value="none">All Assessments</option>
          <option value="project">By Project</option>
          <option value="status">By Status</option>
        </select>
        <select
          className="form-select"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ width: 'auto', padding: '8px 36px 8px 14px', fontSize: 13, borderRadius: 8 }}
        >
          <option value="all">All Types</option>
          <option value="scoring">Scoring</option>
          <option value="open">Open</option>
        </select>
        <select
          className="form-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ width: 'auto', padding: '8px 36px 8px 14px', fontSize: 13, borderRadius: 8 }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* ═══ Assessment Cards ═══ */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: 160, height: 14, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: 200, height: 10 }} />
              </div>
              <div className="skeleton" style={{ width: 80, height: 10 }} />
            </div>
          ))}
        </div>
      ) : sortedCards.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: 'center', padding: '48px 28px', marginBottom: 28 }}>
          <p style={{ fontSize: 14, color: 'var(--text-mut)', marginBottom: 14 }}>
            {cards.length === 0 ? 'No assessments yet.' : 'No assessments match your filters.'}
          </p>
          {cards.length === 0 && (
            <Link href="/admin/assessments/new" className="btn btn-primary btn-sm">Create Your First Assessment</Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 28 }}>
          {Array.from(grouped.entries()).map(([groupLabel, groupCards]) => (
            <div key={groupLabel || '__all'}>
              {groupLabel && (
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mut)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '16px 0 8px', marginTop: 8 }}>
                  {groupLabel}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {groupCards.map(card => {
                  const completionPct = card.sent > 0 ? Math.round((card.completed / card.sent) * 100) : 0
                  return (
                    <div
                      key={card.id}
                      className="card"
                      style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16, transition: 'box-shadow 0.15s, transform 0.15s', cursor: 'default' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(6,5,52,0.06)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 42, height: 42, borderRadius: 10,
                        background: 'var(--tusk)', border: '1px solid var(--border-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, flexShrink: 0,
                      }}>
                        {card.type === 'scoring' ? '\u{1F4DD}' : '\u{1F4AC}'}
                      </div>

                      {/* Title + meta */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)' }}>{card.title}</span>
                          {assessmentStatusPill(card.status)}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-mut)' }}>
                          {card.role ?? 'All Roles'}
                          {card.projectName && <> &middot; {card.projectName}</>}
                          {' '}&middot; {card.sent} sent
                        </div>
                      </div>

                      {/* Per-type stats */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
                        {/* Completed */}
                        <div style={{ textAlign: 'center', minWidth: 56 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-mut)', marginBottom: 2 }}>Done</div>
                          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--navy)' }}>
                            {card.completed}<span style={{ fontSize: 13, color: 'var(--text-mut)' }}>/{card.sent}</span>
                          </div>
                        </div>

                        {card.type === 'scoring' ? (
                          <>
                            <div style={{ textAlign: 'center', minWidth: 56 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-mut)', marginBottom: 2 }}>Avg</div>
                              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--navy)' }}>
                                {card.avgScore !== null ? `${card.avgScore}%` : '—'}
                              </div>
                            </div>
                            <div style={{ textAlign: 'center', minWidth: 56 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-mut)', marginBottom: 2 }}>Pass</div>
                              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: card.passRate !== null && card.passRate >= 50 ? 'var(--success)' : card.passRate !== null && card.passRate < 50 ? 'var(--danger)' : 'var(--navy)' }}>
                                {card.passRate !== null ? `${card.passRate}%` : '—'}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', minWidth: 64 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-mut)', marginBottom: 2 }}>Reviewed</div>
                            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--navy)' }}>
                              {card.reviewedCount ?? 0}<span style={{ fontSize: 13, color: 'var(--text-mut)' }}>/{card.completed}</span>
                              {(card.pendingReviewCount ?? 0) > 0 && (
                                <span style={{ marginLeft: 6, fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: 'var(--accent)' }}>
                                  {card.pendingReviewCount} pending
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Completion bar */}
                        <div style={{ width: 80, flexShrink: 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-mut)', marginBottom: 4, textAlign: 'right' }}>
                            {completionPct}%
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${completionPct}%`, background: completionColor(completionPct) }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Recent Activity ═══ */}
      <div className="card card-pad">
        <div style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, fontSize: 18, color: 'var(--navy)', marginBottom: 20 }}>Recent Activity</div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="skeleton" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: 120, height: 12, marginBottom: 6 }} />
                  <div className="skeleton" style={{ width: 180, height: 10 }} />
                </div>
                <div className="skeleton" style={{ width: 70, height: 22, borderRadius: 100 }} />
              </div>
            ))}
          </div>
        ) : activity.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-mut)', fontSize: 14 }}>
            <p style={{ marginBottom: 12 }}>No activity yet.</p>
            <Link href="/admin/candidates" className="btn btn-primary btn-sm">Invite Your First Candidate</Link>
          </div>
        ) : (
          activity.map((item, idx) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: idx < activity.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'var(--tusk)', border: '1px solid var(--border-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, color: 'var(--navy)', flexShrink: 0,
              }}>{item.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 2 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-mut)' }}>
                  <span style={{ color: 'var(--text-sec)' }}>{item.quiz}</span> &middot; {item.date}
                </div>
              </div>
              {statusPill(item.status, item.score)}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
