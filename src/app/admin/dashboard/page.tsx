'use client'

import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StatCard {
  label: string
  value: string
  subtitle: string
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

interface ActiveAssessment {
  id: string
  icon: string
  title: string
  role: string
  sent: number
  type: 'scoring' | 'open'
  avgScore?: string
}

/* ------------------------------------------------------------------ */
/*  Hardcoded fallback data (matches prototype)                        */
/* ------------------------------------------------------------------ */

const FALLBACK_STATS: StatCard[] = [
  { label: 'Tests Sent', value: '247', subtitle: '+18 this week' },
  { label: 'Open Rate', value: '78%', subtitle: '193 of 247 opened' },
  { label: 'Completion', value: '64%', subtitle: '158 completed' },
  { label: 'Avg Score', value: '72%', subtitle: 'Across all tests' },
  { label: 'Pass Rate', value: '61%', subtitle: '96 of 158 passed' },
]

const FALLBACK_ACTIVITY: ActivityItem[] = [
  { id: '1', initials: 'MS', name: 'Maria Santos', quiz: 'English Proficiency', date: 'Today, 2:14 PM', status: 'passed', score: '85%' },
  { id: '2', initials: 'JC', name: 'James Chen', quiz: 'Cultural Fit Assessment', date: 'Today, 11:30 AM', status: 'completed' },
  { id: '3', initials: 'TW', name: 'Tom Wilson', quiz: 'English Proficiency', date: 'Yesterday, 4:45 PM', status: 'failed', score: '54%' },
  { id: '4', initials: 'AP', name: 'Aisha Patel', quiz: 'English Proficiency', date: 'Yesterday, 3:10 PM', status: 'in_progress' },
]

const FALLBACK_ASSESSMENTS: ActiveAssessment[] = [
  { id: '1', icon: '\u{1F4DD}', title: 'English Proficiency', role: 'All Roles', sent: 142, type: 'scoring', avgScore: '72%' },
  { id: '2', icon: '\u{1F91D}', title: 'Cultural Fit Assessment', role: 'All Roles', sent: 68, type: 'open' },
  { id: '3', icon: '\u{1F4BB}', title: 'Technical Assessment', role: 'Engineering', sent: 37, type: 'scoring', avgScore: '68%' },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const [stats, setStats] = useState<StatCard[]>(FALLBACK_STATS)
  const [activity, setActivity] = useState<ActivityItem[]>(FALLBACK_ACTIVITY)
  const [assessments, setAssessments] = useState<ActiveAssessment[]>(FALLBACK_ASSESSMENTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        if (!isSupabaseConfigured) {
          setLoading(false)
          return
        }

        const { data: submissions } = await supabase
          .from('submissions')
          .select('*, candidates(*), assessments(*)')
          .order('created_at', { ascending: false })

        const { data: allAssessments } = await supabase
          .from('assessments')
          .select('*')
          .eq('status', 'active')

        if (submissions && submissions.length > 0) {
          const totalSent = submissions.length
          const opened = submissions.filter((s: Record<string, unknown>) => s.started_at || s.status !== 'pending').length
          const completed = submissions.filter((s: Record<string, unknown>) => s.status === 'completed').length
          const scored = submissions.filter((s: Record<string, unknown>) => s.score !== null && s.score !== undefined)
          const avgScore = scored.length
            ? Math.round(scored.reduce((sum: number, s: Record<string, unknown>) => sum + ((s.score as number) ?? 0), 0) / scored.length)
            : 0
          const passed = submissions.filter((s: Record<string, unknown>) => s.passed === true).length

          setStats([
            { label: 'Tests Sent', value: String(totalSent), subtitle: 'All time' },
            { label: 'Open Rate', value: `${totalSent ? Math.round((opened / totalSent) * 100) : 0}%`, subtitle: `${opened} of ${totalSent} opened` },
            { label: 'Completion', value: `${totalSent ? Math.round((completed / totalSent) * 100) : 0}%`, subtitle: `${completed} completed` },
            { label: 'Avg Score', value: `${avgScore}%`, subtitle: 'Across all tests' },
            { label: 'Pass Rate', value: `${completed ? Math.round((passed / completed) * 100) : 0}%`, subtitle: `${passed} of ${completed} passed` },
          ])

          setActivity(
            submissions.slice(0, 6).map((s: Record<string, unknown>) => {
              const cand = s.candidates as Record<string, unknown> | null
              const assess = s.assessments as Record<string, unknown> | null
              const name = (cand?.name as string) ?? 'Unknown'
              const initials = name.split(' ').map((w: string) => w[0]?.toUpperCase()).join('').slice(0, 2)
              let status: ActivityItem['status'] = 'in_progress'
              if (s.status === 'completed') {
                status = s.passed === true ? 'passed' : s.passed === false ? 'failed' : 'completed'
              }
              return {
                id: s.id as string,
                initials,
                name,
                quiz: (assess?.title as string) ?? '',
                date: new Date(s.created_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                status,
                score: s.score != null ? `${s.score}%` : undefined,
              }
            })
          )
        }

        if (allAssessments && allAssessments.length > 0 && submissions) {
          setAssessments(
            allAssessments.map((a: Record<string, unknown>) => {
              const subs = submissions.filter((s: Record<string, unknown>) => s.assessment_id === a.id)
              const scored = subs.filter((s: Record<string, unknown>) => s.score !== null && s.score !== undefined)
              const avg = scored.length
                ? Math.round(scored.reduce((sum: number, s: Record<string, unknown>) => sum + ((s.score as number) ?? 0), 0) / scored.length)
                : undefined
              return {
                id: a.id as string,
                icon: (a.type as string) === 'scoring' ? '\u{1F4DD}' : '\u{1F91D}',
                title: a.title as string,
                role: (a.role as string) ?? 'All Roles',
                sent: subs.length,
                type: (a.type as 'scoring' | 'open') ?? 'scoring',
                avgScore: avg !== undefined ? `${avg}%` : undefined,
              }
            })
          )
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  function statusPill(status: ActivityItem['status'], score?: string) {
    const config: Record<ActivityItem['status'], { cls: string; label: string }> = {
      passed:      { cls: 'pill pill-success', label: `Passed ${score ?? ''}`.trim() },
      completed:   { cls: 'pill pill-blue',    label: 'Completed' },
      failed:      { cls: 'pill pill-danger',  label: `Failed ${score ?? ''}`.trim() },
      in_progress: { cls: 'pill pill-accent',  label: 'In Progress' },
    }
    const c = config[status]
    return <span className={c.cls}>{c.label}</span>
  }

  function typePill(type: ActiveAssessment['type']) {
    if (type === 'scoring') return <span className="pill pill-purple">Scoring</span>
    return <span className="pill pill-accent">Open</span>
  }

  return (
    <div className="anim-up">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: 'var(--navy)', marginBottom: 4 }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: 'var(--text-mut)' }}>Overview of assessment activity and results</p>
      </div>

      {/* Stats Row */}
      <div className="stats-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card card-pad">
                <div style={{ width: 80, height: 12, marginBottom: 12, background: 'var(--cream)', borderRadius: 6, animation: 'shimmer 1.5s infinite' }} />
                <div style={{ width: 60, height: 32, marginBottom: 10, background: 'var(--cream)', borderRadius: 6 }} />
                <div style={{ width: 100, height: 10, background: 'var(--cream)', borderRadius: 6 }} />
              </div>
            ))
          : stats.map((s, i) => (
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

      {/* Two-column content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Activity */}
        <div className="card card-pad">
          <div style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, fontSize: 18, color: 'var(--navy)', marginBottom: 20 }}>Recent Activity</div>
          {activity.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--tusk)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>{item.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 2 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-mut)' }}><span style={{ color: 'var(--text-sec)' }}>{item.quiz}</span> &middot; {item.date}</div>
              </div>
              {statusPill(item.status, item.score)}
            </div>
          ))}
        </div>

        {/* Active Assessments */}
        <div className="card card-pad">
          <div style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, fontSize: 18, color: 'var(--navy)', marginBottom: 20 }}>Active Assessments</div>
          {assessments.map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--cream)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{a.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 2 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-mut)' }}>{a.role} &middot; {a.sent} sent</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {typePill(a.type)}
                {a.avgScore && <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--navy)' }}>{a.avgScore}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
