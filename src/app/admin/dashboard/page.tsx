'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
  { id: '1', icon: '📝', title: 'English Proficiency', role: 'All Roles', sent: 142, type: 'scoring', avgScore: '72%' },
  { id: '2', icon: '🤝', title: 'Cultural Fit Assessment', role: 'All Roles', sent: 68, type: 'open' },
  { id: '3', icon: '💻', title: 'Technical Assessment', role: 'Engineering', sent: 37, type: 'scoring', avgScore: '68%' },
]

/* ------------------------------------------------------------------ */
/*  Pill helper                                                        */
/* ------------------------------------------------------------------ */

function statusPill(status: ActivityItem['status'], score?: string) {
  const config: Record<ActivityItem['status'], { className: string; label: string }> = {
    passed:      { className: 'pill-success', label: `Passed ${score ?? ''}`.trim() },
    completed:   { className: 'pill-blue',    label: 'Completed' },
    failed:      { className: 'pill-danger',  label: `Failed ${score ?? ''}`.trim() },
    in_progress: { className: 'pill-accent',  label: 'In Progress' },
  }
  const c = config[status]
  return <span className={c.className}>{c.label}</span>
}

function typePill(type: ActiveAssessment['type']) {
  if (type === 'scoring') return <span className="pill-purple">Scoring</span>
  return <span className="pill-accent">Open</span>
}

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
        /* ---------------------------------------------------------
         * Supabase fetch — uncomment when database is connected
         * ---------------------------------------------------------
         *
         * const { data: submissions } = await supabase
         *   .from('submissions')
         *   .select('*, candidates(*), assessments(*)')
         *   .order('created_at', { ascending: false })
         *
         * const { data: allAssessments } = await supabase
         *   .from('assessments')
         *   .select('*')
         *   .eq('status', 'active')
         *
         * if (submissions && allAssessments) {
         *   // Calculate stats from real data
         *   const totalSent = submissions.length
         *   const opened = submissions.filter(s => s.started_at).length
         *   const completed = submissions.filter(s => s.status === 'completed').length
         *   const scored = submissions.filter(s => s.score !== null)
         *   const avgScore = scored.length
         *     ? Math.round(scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length)
         *     : 0
         *   const passed = submissions.filter(s => s.passed === true).length
         *
         *   setStats([
         *     { label: 'Tests Sent', value: String(totalSent), subtitle: 'All time' },
         *     { label: 'Open Rate', value: `${totalSent ? Math.round((opened / totalSent) * 100) : 0}%`, subtitle: `${opened} of ${totalSent} opened` },
         *     { label: 'Completion', value: `${totalSent ? Math.round((completed / totalSent) * 100) : 0}%`, subtitle: `${completed} completed` },
         *     { label: 'Avg Score', value: `${avgScore}%`, subtitle: 'Across all tests' },
         *     { label: 'Pass Rate', value: `${completed ? Math.round((passed / completed) * 100) : 0}%`, subtitle: `${passed} of ${completed} passed` },
         *   ])
         *
         *   // Map recent submissions to activity items
         *   setActivity(
         *     submissions.slice(0, 6).map((s) => {
         *       const name = s.candidates?.name ?? 'Unknown'
         *       const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase()
         *       let status: ActivityItem['status'] = 'in_progress'
         *       if (s.status === 'completed') {
         *         status = s.passed === true ? 'passed' : s.passed === false ? 'failed' : 'completed'
         *       }
         *       return {
         *         id: s.id,
         *         initials,
         *         name,
         *         quiz: s.assessments?.title ?? '',
         *         date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
         *         status,
         *         score: s.score != null ? `${s.score}%` : undefined,
         *       }
         *     })
         *   )
         *
         *   // Map active assessments
         *   setAssessments(
         *     allAssessments.map((a) => {
         *       const subs = submissions.filter(s => s.assessment_id === a.id)
         *       const scored = subs.filter(s => s.score !== null)
         *       const avg = scored.length
         *         ? Math.round(scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length)
         *         : undefined
         *       return {
         *         id: a.id,
         *         icon: a.type === 'scoring' ? '📝' : '🤝',
         *         title: a.title,
         *         role: a.role ?? 'All Roles',
         *         sent: subs.length,
         *         type: a.type,
         *         avgScore: avg !== undefined ? `${avg}%` : undefined,
         *       }
         *     })
         *   )
         * }
         * --------------------------------------------------------- */
      } catch (err) {
        console.error('Dashboard fetch error:', err)
        // Falls back to hardcoded data already in state
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  return (
    <>
      <style jsx>{`
        .dashboard {
          padding: 32px 40px;
          max-width: 1320px;
          margin: 0 auto;
        }

        /* Header */
        .dash-header {
          margin-bottom: 32px;
        }
        .dash-header h1 {
          font-family: 'DM Serif Display', serif;
          font-weight: 400;
          font-size: 26px;
          color: var(--navy);
          margin-bottom: 4px;
        }
        .dash-header p {
          font-size: 14px;
          color: var(--text-mut);
        }

        /* Stats grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }
        .stat-card {
          background: var(--white);
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 22px 20px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .stat-card:hover {
          box-shadow: 0 2px 12px rgba(6, 5, 52, 0.06);
          transform: translateY(-1px);
        }
        .stat-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: var(--text-mut);
          margin-bottom: 8px;
        }
        .stat-value {
          font-family: 'DM Serif Display', serif;
          font-size: 32px;
          font-weight: 400;
          color: var(--navy);
          line-height: 1.1;
          margin-bottom: 6px;
        }
        .stat-subtitle {
          font-size: 12px;
          color: var(--text-mut);
        }

        /* Two-column grid */
        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .card {
          background: var(--white);
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 24px;
        }
        .card-title {
          font-family: 'DM Serif Display', serif;
          font-weight: 400;
          font-size: 18px;
          color: var(--navy);
          margin-bottom: 20px;
        }

        /* Activity list */
        .activity-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid var(--border-light);
        }
        .activity-item:last-child {
          border-bottom: none;
        }
        .activity-item:first-child {
          padding-top: 0;
        }
        .avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--tusk);
          border: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: var(--navy);
          flex-shrink: 0;
        }
        .activity-info {
          flex: 1;
          min-width: 0;
        }
        .activity-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--navy);
          margin-bottom: 2px;
        }
        .activity-meta {
          font-size: 12px;
          color: var(--text-mut);
        }
        .activity-meta span {
          color: var(--text-sec);
        }

        /* Assessment rows */
        .assessment-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid var(--border-light);
        }
        .assessment-item:last-child {
          border-bottom: none;
        }
        .assessment-item:first-child {
          padding-top: 0;
        }
        .assessment-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--cream);
          border: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .assessment-info {
          flex: 1;
          min-width: 0;
        }
        .assessment-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--navy);
          margin-bottom: 2px;
        }
        .assessment-meta {
          font-size: 12px;
          color: var(--text-mut);
        }
        .assessment-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .assessment-score {
          font-family: 'DM Serif Display', serif;
          font-size: 18px;
          color: var(--navy);
        }

        /* Pills */
        .pill-success,
        .pill-danger,
        .pill-accent,
        .pill-blue,
        .pill-purple {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 100px;
          white-space: nowrap;
        }
        .pill-success {
          background: var(--success-light);
          color: var(--success);
        }
        .pill-danger {
          background: var(--danger-light);
          color: var(--danger);
        }
        .pill-accent {
          background: var(--accent-light);
          color: var(--accent);
        }
        .pill-blue {
          background: var(--blue-light);
          color: var(--blue);
        }
        .pill-purple {
          background: var(--purple-light);
          color: var(--purple);
        }

        /* Loading skeleton */
        .skeleton {
          background: linear-gradient(90deg, var(--cream) 25%, var(--border-light) 50%, var(--cream) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Responsive */
        @media (max-width: 1100px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .two-col {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .dashboard {
            padding: 20px 16px;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <div className="dashboard anim-up">
        {/* Header */}
        <div className="dash-header">
          <h1>Dashboard</h1>
          <p>Overview of assessment activity and results</p>
        </div>

        {/* Stats Row */}
        <div className="stats-grid">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="stat-card">
                  <div className="skeleton" style={{ width: 80, height: 12, marginBottom: 12 }} />
                  <div className="skeleton" style={{ width: 60, height: 32, marginBottom: 10 }} />
                  <div className="skeleton" style={{ width: 100, height: 10 }} />
                </div>
              ))
            : stats.map((s, i) => (
                <div key={i} className="stat-card">
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-subtitle">{s.subtitle}</div>
                </div>
              ))}
        </div>

        {/* Two-column content */}
        <div className="two-col">
          {/* Recent Activity */}
          <div className="card">
            <div className="card-title">Recent Activity</div>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="activity-item">
                  <div className="skeleton" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ width: 120, height: 14, marginBottom: 6 }} />
                    <div className="skeleton" style={{ width: 180, height: 10 }} />
                  </div>
                  <div className="skeleton" style={{ width: 70, height: 22, borderRadius: 100 }} />
                </div>
              ))
            ) : (
              activity.map((item) => (
                <div key={item.id} className="activity-item">
                  <div className="avatar">{item.initials}</div>
                  <div className="activity-info">
                    <div className="activity-name">{item.name}</div>
                    <div className="activity-meta">
                      <span>{item.quiz}</span> &middot; {item.date}
                    </div>
                  </div>
                  {statusPill(item.status, item.score)}
                </div>
              ))
            )}
          </div>

          {/* Active Assessments */}
          <div className="card">
            <div className="card-title">Active Assessments</div>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="assessment-item">
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ width: 140, height: 14, marginBottom: 6 }} />
                    <div className="skeleton" style={{ width: 100, height: 10 }} />
                  </div>
                  <div className="skeleton" style={{ width: 56, height: 22, borderRadius: 100 }} />
                </div>
              ))
            ) : (
              assessments.map((a) => (
                <div key={a.id} className="assessment-item">
                  <div className="assessment-icon">{a.icon}</div>
                  <div className="assessment-info">
                    <div className="assessment-title">{a.title}</div>
                    <div className="assessment-meta">
                      {a.role} &middot; {a.sent} sent
                    </div>
                  </div>
                  <div className="assessment-right">
                    {typePill(a.type)}
                    {a.avgScore && <div className="assessment-score">{a.avgScore}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
