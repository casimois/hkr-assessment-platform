'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { supabase, type Section, type Question } from '@/lib/supabase'

/* ---------- types ---------- */
interface SubmissionDetail {
  id: string
  score: number | null
  passed: boolean | null
  status: string
  answers: Record<string, unknown>
  selected_sections: Section[] | null
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

function scoreQuestion(q: Question, answer: unknown, manualScore?: number): { earned: number; correct: boolean | null } {
  if (answer === undefined || answer === null || answer === '') {
    // Written questions can still have a manual score even if technically "empty" isn't expected
    if (q.type === 'written' && manualScore !== undefined) {
      return { earned: manualScore, correct: null }
    }
    return { earned: 0, correct: null }
  }

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
  // written — use manual score if provided
  if (q.type === 'written' && manualScore !== undefined) {
    return { earned: manualScore, correct: null }
  }
  return { earned: 0, correct: null }
}

/* ---------- shared inline style constants ---------- */
const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-mut)', marginBottom: 8 }
const METRIC: React.CSSProperties = { fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 400, color: 'var(--navy)', lineHeight: 1.1, marginBottom: 6 }
const SECTION_TITLE: React.CSSProperties = { fontFamily: "'DM Serif Display', serif", fontWeight: 400, fontSize: 18, color: 'var(--navy)', marginBottom: 20 }
const SUB_TEXT: React.CSSProperties = { fontSize: 12, color: 'var(--text-mut)' }

/* ---------- component ---------- */
export default function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null)
  const [peerStats, setPeerStats] = useState<PeerStats>({ total: 0, avgScore: 0, scores: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [manualScores, setManualScores] = useState<Record<string, number>>({})
  const [gradingDirty, setGradingDirty] = useState(false)
  const [savingGrades, setSavingGrades] = useState(false)

  const handleExport = useCallback(async (format: 'pdf' | 'png') => {
    if (!contentRef.current || !submission) return
    setExporting(true)

    // Wait for React to render the export header (logo img), then wait for the logo to load
    await new Promise(r => setTimeout(r, 100))
    const logoImg = contentRef.current?.querySelector('img[alt="HKR Logo"]') as HTMLImageElement | null
    if (logoImg && !logoImg.complete) {
      await new Promise<void>(r => { logoImg.onload = () => r(); logoImg.onerror = () => r() })
    }

    try {
      const html2canvas = (await import('html2canvas-pro')).default
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFEF3',
        logging: false,
      })

      const candidateName = submission.candidates.name.replace(/\s+/g, '-').toLowerCase()
      const dateStr = new Date().toISOString().slice(0, 10)

      if (format === 'png') {
        const link = document.createElement('a')
        link.download = `${candidateName}-assessment-${dateStr}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      } else {
        const { jsPDF } = await import('jspdf')
        const imgW = canvas.width
        const imgH = canvas.height
        const pdfW = 210 // A4 width in mm
        const pdfH = (imgH * pdfW) / imgW
        const pdf = new jsPDF({ orientation: pdfH > 297 ? 'p' : 'p', unit: 'mm', format: [pdfW, pdfH] })
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfW, pdfH)
        pdf.save(`${candidateName}-assessment-${dateStr}.pdf`)
      }
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }, [submission])

  const saveGrades = useCallback(async () => {
    if (!submission) return
    setSavingGrades(true)
    try {
      // Recalculate total score including manual grades — use selected_sections if available
      const allQs = getAllQuestions(submission.selected_sections ?? submission.assessments.sections)
      let earned = 0
      let possible = 0
      for (const { question: q } of allQs) {
        possible += q.points
        const ans = submission.answers[q.id]
        const ms = manualScores[q.id]
        const result = scoreQuestion(q, ans, ms)
        earned += result.earned
      }
      const newScore = possible > 0 ? Math.round((earned / possible) * 100) : 0
      const threshold = submission.assessments.pass_threshold ?? 70
      const newPassed = submission.assessments.type === 'scoring' ? newScore >= threshold : null

      // Save manual scores inside the answers object, plus update score/passed
      const updatedAnswers = { ...submission.answers, __manual_scores: manualScores }
      const { error: updateErr } = await supabase
        .from('submissions')
        .update({
          answers: updatedAnswers,
          score: newScore,
          passed: newPassed,
        })
        .eq('id', submission.id)

      if (updateErr) throw updateErr

      // Update local state
      setSubmission(prev => prev ? { ...prev, answers: updatedAnswers, score: newScore, passed: newPassed } : prev)
      setGradingDirty(false)
    } catch (err) {
      console.error('Save grades error:', err)
      alert('Failed to save grades')
    } finally {
      setSavingGrades(false)
    }
  }, [submission, manualScores])

  useEffect(() => {
    async function load() {
      try {
        const { id } = await params

        const { data, error: fetchErr } = await supabase
          .from('submissions')
          .select('*, assessments(*, projects(name)), candidates(name, email)')
          .eq('id', id)
          .single()

        if (fetchErr || !data) throw fetchErr || new Error('Submission not found')
        setSubmission(data as unknown as SubmissionDetail)

        // Load manual scores from answers object
        const answers = (data as Record<string, unknown>).answers as Record<string, unknown>
        if (answers && typeof answers.__manual_scores === 'object' && answers.__manual_scores !== null) {
          setManualScores(answers.__manual_scores as Record<string, number>)
        }

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
  const isScoring = assessment.type === 'scoring'
  // Use selected_sections (randomized per candidate) if available, otherwise full assessment
  const activeSections = submission.selected_sections ?? assessment.sections
  const allQuestions = getAllQuestions(activeSections)
  const totalPoints = allQuestions.reduce((sum, q) => sum + q.question.points, 0)
  const percentile = isScoring && submission.score !== null ? getPercentile(submission.score, peerStats.scores) : null
  const earnedPoints = isScoring && submission.score !== null ? Math.round((submission.score / 100) * totalPoints) : 0

  const sectionBreakdown = activeSections.map(sec => {
    let secEarned = 0
    let secPossible = 0
    let secCorrect = 0
    const secTotal = sec.questions.length

    for (const q of sec.questions) {
      secPossible += q.points
      const result = scoreQuestion(q, submission.answers[q.id], manualScores[q.id])
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
      {/* Back link + export buttons (hidden during export) */}
      {!exporting && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <Link href="/admin/results" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-mut)', textDecoration: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Back to Results
          </Link>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" style={{ fontSize: 12 }} onClick={() => handleExport('png')} disabled={exporting}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
              PNG
            </button>
            <button className="btn btn-primary btn-sm" style={{ fontSize: 12 }} onClick={() => handleExport('pdf')} disabled={exporting}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              PDF
            </button>
          </div>
        </div>
      )}

      {/* Exportable content area */}
      <div ref={contentRef} style={{ background: 'var(--offwhite)', padding: exporting ? 32 : 0 }}>

      {/* Branded header for export */}
      {exporting && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border-light)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://hkr.team/hubfs/Navy(spread)_vector.svg" alt="HKR Logo" style={{ height: 22 }} />
          <div style={{ fontSize: 11, color: 'var(--text-mut)' }}>Assessment Report · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--cream)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, flexShrink: 0, fontFamily: 'var(--font-sans)' }}>
            {getInitials(candidate.name)}
          </div>
          <div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: 'var(--navy)', marginBottom: 2 }}>{candidate.name}</h1>
            <p style={{ fontSize: 13, color: 'var(--text-mut)' }}>{candidate.email}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--navy)', marginBottom: 4 }}>{assessment.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-mut)' }}>
            {assessment.projects?.name ?? 'No Project'} {assessment.role ? `· ${assessment.role}` : ''}
          </div>
        </div>
      </div>

      {/* Score overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {isScoring && (
          <>
            {/* Score */}
            <div className="card card-pad" style={{ textAlign: 'center' }}>
              <div style={LABEL}>Score</div>
              <div style={{ ...METRIC, fontSize: 36, color: submission.passed ? 'var(--success)' : submission.passed === false ? 'var(--danger)' : 'var(--navy)' }}>
                {submission.score !== null ? `${submission.score}%` : '--'}
              </div>
              {submission.passed !== null && (
                <span className={`pill ${submission.passed ? 'pill-success' : 'pill-danger'}`}>
                  {submission.passed ? 'Passed' : 'Failed'}
                </span>
              )}
            </div>

            {/* Points */}
            <div className="card card-pad" style={{ textAlign: 'center' }}>
              <div style={LABEL}>Points</div>
              <div style={METRIC}>
                {earnedPoints}<span style={{ fontSize: 20, color: 'var(--text-mut)' }}>/{totalPoints}</span>
              </div>
              <span style={SUB_TEXT}>
                {allQuestions.length} question{allQuestions.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Ranking */}
            <div className="card card-pad" style={{ textAlign: 'center' }}>
              <div style={LABEL}>Ranking</div>
              <div style={{ ...METRIC, fontSize: percentile !== null && getPercentileLabel(percentile).length > 8 ? 24 : 32 }}>
                {percentile !== null ? getPercentileLabel(percentile) : '--'}
              </div>
              <span style={SUB_TEXT}>
                {peerStats.total > 1 ? `out of ${peerStats.total} candidates` : peerStats.total === 1 ? 'only candidate' : 'no peers yet'}
              </span>
            </div>
          </>
        )}

        {!isScoring && (
          <div className="card card-pad" style={{ textAlign: 'center' }}>
            <div style={LABEL}>Questions</div>
            <div style={METRIC}>{allQuestions.length}</div>
            <span className="pill pill-navy">Open Assessment</span>
          </div>
        )}

        {/* Time */}
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <div style={LABEL}>Time Taken</div>
          <div style={METRIC}>
            {formatDuration(submission.started_at, submission.completed_at)}
          </div>
          <span style={SUB_TEXT}>
            of {assessment.time_limit}m allowed
          </span>
        </div>
      </div>

      {/* Comparison with average */}
      {isScoring && submission.score !== null && peerStats.total > 1 && (
        <div className="card card-pad" style={{ marginBottom: 32 }}>
          <h3 style={SECTION_TITLE}>Comparison with Average</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              {/* This candidate */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{candidate.name}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: submission.passed ? 'var(--success)' : 'var(--danger)' }}>{submission.score}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--border-light)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${submission.score}%`, borderRadius: 4, background: submission.passed ? 'var(--success)' : 'var(--danger)', transition: 'width 0.6s ease' }} />
                </div>
              </div>
              {/* Average */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-mut)' }}>Average ({peerStats.total} candidates)</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--text-mut)' }}>{peerStats.avgScore}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--border-light)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${peerStats.avgScore}%`, borderRadius: 4, background: 'var(--text-mut)', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            </div>

            {/* Delta */}
            <div style={{ textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 400, color: (submission.score ?? 0) >= peerStats.avgScore ? 'var(--success)' : 'var(--danger)' }}>
                {(submission.score ?? 0) >= peerStats.avgScore ? '+' : ''}{(submission.score ?? 0) - peerStats.avgScore}%
              </div>
              <div style={SUB_TEXT}>vs average</div>
            </div>
          </div>
        </div>
      )}

      {/* Section breakdown — scoring only */}
      {isScoring && (
        <div className="card card-pad" style={{ marginBottom: 32 }}>
          <h3 style={SECTION_TITLE}>Section Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionBreakdown.map((sec, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--navy)' }}>{sec.title}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={SUB_TEXT}>{sec.correct}/{sec.total} correct</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: sec.percent >= 70 ? 'var(--success)' : sec.percent >= 50 ? 'var(--accent)' : 'var(--danger)' }}>
                      {sec.percent}%
                    </span>
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--border-light)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${sec.percent}%`,
                    borderRadius: 3,
                    background: sec.percent >= 70 ? 'var(--success)' : sec.percent >= 50 ? 'var(--accent)' : 'var(--danger)',
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question-by-question */}
      <div className="card card-pad" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ ...SECTION_TITLE, marginBottom: 0 }}>Question Details</h3>
          {gradingDirty && !exporting && (
            <button
              className="btn btn-primary btn-sm"
              style={{ fontSize: 12 }}
              onClick={saveGrades}
              disabled={savingGrades}
            >
              {savingGrades ? 'Saving...' : '💾 Save Grades'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {allQuestions.map(({ question: q }, i) => {
            const answer = submission.answers[q.id]
            const ms = manualScores[q.id]
            const result = scoreQuestion(q, answer, ms)
            const answered = answer !== undefined && answer !== null && answer !== ''
            const isWritten = q.type === 'written'
            const hasManualScore = ms !== undefined

            return (
              <div key={q.id} style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border-light)', background: result.correct === true ? 'var(--success-light)' : result.correct === false ? 'var(--danger-light)' : isWritten && hasManualScore ? 'var(--blue-light)' : 'var(--cream)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mut)', flexShrink: 0 }}>Q{i + 1}</span>
                    <span style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 500 }}>{q.text}</span>
                    {q.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={q.image_url} alt="Question image" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, marginTop: 4, border: '1px solid var(--border-light)' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span className="pill pill-navy" style={{ fontSize: 10, padding: '2px 8px' }}>
                      {q.type.replace('_', ' ')}
                    </span>
                    {result.correct === true && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                    {result.correct === false && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    )}
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-mut)' }}>
                      {result.earned}/{q.points}pt
                    </span>
                  </div>
                </div>

                {answered && (
                  <div style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 6 }}>
                    <span style={{ color: 'var(--text-mut)', marginRight: 4 }}>Answer:</span>
                    {q.type === 'multiple_choice' && q.options
                      ? q.options[answer as number] ?? String(answer)
                      : q.type === 'ranking' && Array.isArray(answer)
                      ? (answer as string[]).join(' → ')
                      : isWritten
                      ? null
                      : String(answer)
                    }
                  </div>
                )}

                {/* Written answer — show full text in a styled block */}
                {isWritten && answered && (
                  <div style={{ marginTop: 8, padding: '12px 16px', background: 'var(--white)', borderRadius: 10, border: '1px solid var(--border-light)', fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {String(answer)}
                  </div>
                )}

                {!answered && (
                  <div style={{ fontSize: 12, color: 'var(--text-mut)', fontStyle: 'italic', marginTop: 6 }}>Not answered</div>
                )}

                {result.correct === false && q.type === 'multiple_choice' && q.options && q.correct !== undefined && (
                  <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 3 }}>
                    <span style={{ color: 'var(--text-mut)', marginRight: 4 }}>Correct:</span>
                    {q.options[q.correct]}
                  </div>
                )}
                {result.correct === false && q.type === 'fill_blank' && q.accepted_answers && (
                  <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 3 }}>
                    <span style={{ color: 'var(--text-mut)', marginRight: 4 }}>Accepted:</span>
                    {q.accepted_answers.join(', ')}
                  </div>
                )}

                {/* Written grading UI */}
                {isWritten && !exporting && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>Grade:</span>
                    <input
                      className="form-input"
                      type="number"
                      min={0}
                      max={q.points}
                      value={manualScores[q.id] ?? ''}
                      placeholder="—"
                      onChange={e => {
                        const val = e.target.value
                        setManualScores(prev => {
                          if (val === '') {
                            const next = { ...prev }
                            delete next[q.id]
                            return next
                          }
                          return { ...prev, [q.id]: Math.min(q.points, Math.max(0, Number(val))) }
                        })
                        setGradingDirty(true)
                      }}
                      style={{ width: 64, padding: '6px 8px', fontSize: 13, borderRadius: 8, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace" }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-mut)' }}>/ {q.points} pts</span>
                    {hasManualScore && (
                      <span className="pill pill-success" style={{ fontSize: 10, padding: '2px 8px' }}>Graded</span>
                    )}
                    {!hasManualScore && answered && (
                      <span style={{ fontSize: 11, color: 'var(--text-mut)', fontStyle: 'italic' }}>Not graded yet</span>
                    )}
                  </div>
                )}

                {/* Written grading display for export */}
                {isWritten && exporting && hasManualScore && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--navy)', fontWeight: 500 }}>
                    Graded: {ms}/{q.points} pts
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Metadata footer */}
      <div className="card" style={{ padding: '18px 24px', marginBottom: exporting ? 0 : 32 }}>
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

      </div>{/* end contentRef */}
    </div>
  )
}
