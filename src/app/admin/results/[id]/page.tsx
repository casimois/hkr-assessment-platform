'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type Section, type Question } from '@/lib/supabase'

/* ---------- types ---------- */
interface SubmissionDetail {
  id: string
  score: number | null
  passed: boolean | null
  status: string
  answers: Record<string, unknown>
  started_at: string | null
  completed_at: string | null
  created_at: string
  assessments: {
    title: string
    role: string | null
    type: 'scoring' | 'open'
    time_limit: number
    pass_threshold: number | null
    sections: Section[]
    project_id: string | null
    projects: { name: string } | null
  }
  candidates: {
    name: string
    email: string
  }
}

interface PeerStats {
  total: number
  avgScore: number
  scores: number[]
}

/* ---------- helpers ---------- */
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getPercentile(score: number, allScores: number[]): number {
  if (allScores.length <= 1) return 100
  const below = allScores.filter(s => s < score).length
  return Math.round((below / (allScores.length - 1)) * 100)
}

function getPercentileLabel(percentile: number): string {
  if (percentile >= 95) return 'Top 5%'
  if (percentile >= 90) return 'Top 10%'
  if (percentile >= 75) return 'Top 25%'
  if (percentile >= 50) return 'Above Average'
  if (percentile >= 25) return 'Below Average'
  return 'Bottom 25%'
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return '--'
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getAllQuestions(sections: Section[]): { section: string; question: Question }[] {
  const result: { section: string; question: Question }[] = []
  for (const sec of sections) {
    for (const q of sec.questions) {
      result.push({ section: sec.title, question: q })
    }
  }
  return result
}

function scoreQuestion(q: Question, answer: unknown): { earned: number; correct: boolean | null } {
  if (answer === undefined || answer === null || answer === '') return { earned: 0, correct: null }

  if (q.type === 'multiple_choice' && q.correct !== undefined) {
    const isCorrect = answer === q.correct
    return { earned: isCorrect ? q.points : 0, correct: isCorrect }
  }
  if (q.type === 'fill_blank' && q.accepted_answers) {
    const ansStr = String(answer).trim().toLowerCase()
    const isCorrect = q.accepted_answers.some(a => a.toLowerCase() === ansStr)
    return { earned: isCorrect ? q.points : 0, correct: isCorrect }
  }
  if (q.type === 'ranking' && q.items) {
    const ansArr = answer as string[]
    const isCorrect = Array.isArray(ansArr) && ansArr.every((item, i) => item === q.items![i])
    return { earned: isCorrect ? q.points : 0, correct: isCorrect }
  }
  // written — not auto-scored
  return { earned: 0, correct: null }
}

/* ---------- component ---------- */
export default function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null)
  const [peerStats, setPeerStats] = useState<PeerStats>({ total: 0, avgScore: 0, scores: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const { id } = await params

        // Fetch this submission
        const { data, error: fetchErr } = await supabase
          .from('submissions')
          .select('*, assessments(*, projects(name)), candidates(name, email)')
          .eq('id', id)
          .single()

        if (fetchErr || !data) throw fetchErr || new Error('Submission not found')
        setSubmission(data as unknown as SubmissionDetail)

        // Fetch peer submissions for the same assessment
        const { data: peers } = await supabase
          .from('submissions')
          .select('score')
          .eq('assessment_id', data.assessment_id)
          .eq('status', 'completed')

        if (peers) {
          const scores = peers.map(p => p.score).filter((s): s is number => s !== null)
          setPeerStats({
            total: peers.length,
            avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
            scores,
          })
        }
      } catch {
        setError('Submission not found')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params])

  if (loading) {
    return (
      <div className="anim-up" style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-mut)', fontSize: 14 }}>
        Loading submission...
      </div>
    )
  }

  if (error || !submission) {
    return (
      <div className="anim-up" style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
        <p style={{ color: 'var(--text-mut)', marginBottom: 16 }}>{error || 'Submission not found'}</p>
        <Link href="/admin/results" className="btn btn-secondary btn-sm">Back to Results</Link>
      </div>
    )
  }

  const { assessments: assessment, candidates: candidate } = submission
  const allQuestions = getAllQuestions(assessment.sections)
  const totalPoints = allQuestions.reduce((sum, q) => sum + q.question.points, 0)
  const percentile = submission.score !== null ? getPercentile(submission.score, peerStats.scores) : null
  const earnedPoints = submission.score !== null ? Math.round((submission.score / 100) * totalPoints) : 0

  // Section-level breakdown
  const sectionBreakdown = assessment.sections.map(sec => {
    let secEarned = 0
    let secPossible = 0
    let secCorrect = 0
    let secTotal = sec.questions.length

    for (const q of sec.questions) {
      secPossible += q.points
      const result = scoreQuestion(q, submission.answers[q.id])
      secEarned += result.earned
      if (result.correct === true) secCorrect++
    }

    return {
      title: sec.title,
      earned: secEarned,
      possible: secPossible,
      percent: secPossible > 0 ? Math.round((secEarned / secPossible) * 100) : 0,
      correct: secCorrect,
      total: secTotal,
    }
  })

  return (
    <div className="anim-up">
      {/* Back link */}
      <Link href="/admin/results" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-mut)', textDecoration: 'none', marginBottom: 24 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Results
      </Link>

      {/* Header: Candidate info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--cream)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
            {getInitials(candidate.name)}
          </div>
          <div>
            <h1 style={{ fontSize: 24, color: 'var(--navy)', marginBottom: 2 }}>{candidate.name}</h1>
            <p style={{ fontSize: 13, color: 'var(--text-mut)' }}>{candidate.email}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: 'var(--text-mut)', marginBottom: 4 }}>{assessment.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-mut)' }}>
            {assessment.projects?.name ?? 'No Project'} {assessment.role ? `· ${assessment.role}` : ''}
          </div>
        </div>
      </div>

      {/* Score overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {/* Score */}
        <div className="card" style={{ padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-mut)', marginBottom: 8 }}>Score</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 36, fontWeight: 700, color: submission.passed ? 'var(--success)' : submission.passed === false ? 'var(--danger)' : 'var(--navy)', marginBottom: 4 }}>
            {submission.score !== null ? `${submission.score}%` : '--'}
          </div>
          {submission.passed !== null && (
            <span className={`pill ${submission.passed ? 'pill-success' : 'pill-danger'}`} style={{ fontSize: 11 }}>
              {submission.passed ? 'Passed' : 'Failed'}
            </span>
          )}
        </div>

        {/* Points */}
        <div className="card" style={{ padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-mut)', marginBottom: 8 }}>Points</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 36, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>
            {earnedPoints}<span style={{ fontSize: 18, color: 'var(--text-mut)', fontWeight: 400 }}>/{totalPoints}</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-mut)' }}>
            {allQuestions.length} question{allQuestions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Ranking */}
        <div className="card" style={{ padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-mut)', marginBottom: 8 }}>Ranking</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>
            {percentile !== null ? getPercentileLabel(percentile) : '--'}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-mut)' }}>
            {peerStats.total > 1 ? `out of ${peerStats.total} candidates` : peerStats.total === 1 ? 'only candidate' : 'no peers yet'}
          </span>
        </div>

        {/* Time */}
        <div className="card" style={{ padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-mut)', marginBottom: 8 }}>Time Taken</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>
            {formatDuration(submission.started_at, submission.completed_at)}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-mut)' }}>
            of {assessment.time_limit}m allowed
          </span>
        </div>
      </div>

      {/* Comparison with average */}
      {submission.score !== null && peerStats.total > 1 && (
        <div className="card" style={{ padding: '24px', marginBottom: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 16 }}>Comparison with Average</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {/* Bar chart visual */}
            <div style={{ flex: 1, minWidth: 240 }}>
              {/* This candidate */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{candidate.name}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: submission.passed ? 'var(--success)' : 'var(--danger)' }}>{submission.score}%</span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: 'var(--border-light)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${submission.score}%`, borderRadius: 5, background: submission.passed ? 'var(--success)' : 'var(--danger)', transition: 'width 0.6s ease' }} />
                </div>
              </div>
              {/* Average */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-mut)' }}>Average ({peerStats.total} candidates)</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-mut)' }}>{peerStats.avgScore}%</span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: 'var(--border-light)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${peerStats.avgScore}%`, borderRadius: 5, background: 'var(--text-mut)', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            </div>

            {/* Delta */}
            <div style={{ textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: (submission.score ?? 0) >= peerStats.avgScore ? 'var(--success)' : 'var(--danger)' }}>
                {(submission.score ?? 0) >= peerStats.avgScore ? '+' : ''}{(submission.score ?? 0) - peerStats.avgScore}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-mut)' }}>vs average</div>
            </div>
          </div>
        </div>
      )}

      {/* Section breakdown */}
      <div className="card" style={{ padding: '24px', marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 16 }}>Section Breakdown</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sectionBreakdown.map((sec, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{sec.title}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-mut)' }}>{sec.correct}/{sec.total} correct</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: sec.percent >= 70 ? 'var(--success)' : sec.percent >= 50 ? 'var(--accent)' : 'var(--danger)' }}>
                    {sec.percent}%
                  </span>
                </div>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'var(--border-light)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${sec.percent}%`,
                  borderRadius: 4,
                  background: sec.percent >= 70 ? 'var(--success)' : sec.percent >= 50 ? 'var(--accent)' : 'var(--danger)',
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Question-by-question */}
      <div className="card" style={{ padding: '24px', marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 16 }}>Question Details</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {allQuestions.map(({ section, question: q }, i) => {
            const answer = submission.answers[q.id]
            const result = scoreQuestion(q, answer)
            const answered = answer !== undefined && answer !== null && answer !== ''

            return (
              <div key={q.id} style={{ padding: '16px', borderRadius: 12, border: '1px solid var(--border-light)', background: result.correct === true ? 'rgba(16,185,129,0.03)' : result.correct === false ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mut)', flexShrink: 0 }}>Q{i + 1}</span>
                    <span style={{ fontSize: 13, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.text}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span className={`pill ${q.type === 'multiple_choice' ? 'pill-blue' : q.type === 'fill_blank' ? 'pill-accent' : q.type === 'ranking' ? 'pill-purple' : 'pill-navy'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                      {q.type.replace('_', ' ')}
                    </span>
                    {result.correct === true && (
                      <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </span>
                    )}
                    {result.correct === false && (
                      <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </span>
                    )}
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--text-mut)' }}>
                      {result.earned}/{q.points}pt
                    </span>
                  </div>
                </div>

                {/* Candidate's answer */}
                {answered && (
                  <div style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 4 }}>
                    <span style={{ color: 'var(--text-mut)', marginRight: 4 }}>Answer:</span>
                    {q.type === 'multiple_choice' && q.options
                      ? q.options[answer as number] ?? String(answer)
                      : q.type === 'ranking' && Array.isArray(answer)
                      ? (answer as string[]).join(' → ')
                      : String(answer)
                    }
                  </div>
                )}
                {!answered && (
                  <div style={{ fontSize: 12, color: 'var(--text-mut)', fontStyle: 'italic', marginTop: 4 }}>Not answered</div>
                )}

                {/* Show correct answer for wrong answers */}
                {result.correct === false && q.type === 'multiple_choice' && q.options && q.correct !== undefined && (
                  <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 2 }}>
                    <span style={{ color: 'var(--text-mut)', marginRight: 4 }}>Correct:</span>
                    {q.options[q.correct]}
                  </div>
                )}
                {result.correct === false && q.type === 'fill_blank' && q.accepted_answers && (
                  <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 2 }}>
                    <span style={{ color: 'var(--text-mut)', marginRight: 4 }}>Accepted:</span>
                    {q.accepted_answers.join(', ')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Metadata */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 32 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, fontSize: 13 }}>
          <div>
            <span style={{ color: 'var(--text-mut)' }}>Status: </span>
            <span style={{ fontWeight: 600, color: 'var(--navy)', textTransform: 'capitalize' }}>{submission.status.replace(/_/g, ' ')}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-mut)' }}>Invited: </span>
            <span style={{ color: 'var(--text-sec)' }}>{formatDate(submission.created_at)}</span>
          </div>
          {submission.started_at && (
            <div>
              <span style={{ color: 'var(--text-mut)' }}>Started: </span>
              <span style={{ color: 'var(--text-sec)' }}>{formatDate(submission.started_at)}</span>
            </div>
          )}
          {submission.completed_at && (
            <div>
              <span style={{ color: 'var(--text-mut)' }}>Completed: </span>
              <span style={{ color: 'var(--text-sec)' }}>{formatDate(submission.completed_at)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
