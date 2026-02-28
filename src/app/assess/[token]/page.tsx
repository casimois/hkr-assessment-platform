'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase, isSupabaseConfigured, type Section, type Question } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Screen = 'identify' | 'welcome' | 'quiz' | 'done' | 'error'

interface AssessmentData {
  title: string
  role: string
  time_limit: number
  sections: Section[]
}

interface SubmissionData {
  id: string
  token: string
  status: string
  answers: Record<string, unknown>
  assessments: AssessmentData
  candidates: { name: string; email: string }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getAllQuestions(sections: Section[]): { section: string; question: Question; globalIndex: number }[] {
  const result: { section: string; question: Question; globalIndex: number }[] = []
  let idx = 0
  for (const sec of sections) {
    for (const q of sec.questions) {
      result.push({ section: sec.title, question: q, globalIndex: idx })
      idx++
    }
  }
  return result
}

function getTotalPoints(sections: Section[]): number {
  return sections.reduce(
    (sum, s) => sum + s.questions.reduce((qs, q) => qs + q.points, 0),
    0
  )
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AssessPage({ params }: { params: Promise<{ token: string }> }) {
  /* --- core state --- */
  const [screen, setScreen] = useState<Screen>('identify')
  const [loading, setLoading] = useState(true)
  const [submission, setSubmission] = useState<SubmissionData | null>(null)
  const [resolvedToken, setResolvedToken] = useState<string>('')

  /* --- identify form --- */
  const [identifyName, setIdentifyName] = useState('')
  const [identifyEmail, setIdentifyEmail] = useState('')

  /* --- quiz state --- */
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ---------------------------------------------------------------- */
  /*  Fetch submission by token                                        */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    async function load() {
      const { token } = await params
      setResolvedToken(token)

      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('*, assessments(*), candidates(*)')
          .eq('token', token)
          .single()

        if (error || !data) throw error

        setSubmission(data as unknown as SubmissionData)
        setIdentifyName(data.candidates?.name ?? '')
        setIdentifyEmail(data.candidates?.email ?? '')
        setSecondsLeft((data.assessments?.time_limit ?? 20) * 60)
      } catch {
        setScreen('error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params])

  /* ---------------------------------------------------------------- */
  /*  Derived data                                                     */
  /* ---------------------------------------------------------------- */

  const defaultAssessment: AssessmentData = { title: '', role: '', time_limit: 20, sections: [] }
  const assessment = submission?.assessments ?? defaultAssessment
  const allQuestions = getAllQuestions(assessment.sections)
  const totalPoints = getTotalPoints(assessment.sections)
  const totalQuestions = allQuestions.length
  const current = allQuestions[currentIndex]
  const answeredCount = Object.keys(answers).length

  /* ---------------------------------------------------------------- */
  /*  Timer                                                            */
  /* ---------------------------------------------------------------- */

  /* ---------------------------------------------------------------- */
  /*  Score calculation + save                                         */
  /* ---------------------------------------------------------------- */

  const scoreAndSave = useCallback(async (finalAnswers: Record<string, unknown>) => {
    const sections = submission?.assessments?.sections ?? []
    let earned = 0
    let possible = 0

    for (const sec of sections) {
      for (const q of sec.questions) {
        possible += q.points
        const ans = finalAnswers[q.id]
        if (ans === undefined || ans === null || ans === '') continue

        if (q.type === 'multiple_choice' && q.correct !== undefined) {
          if (ans === q.correct) earned += q.points
        } else if (q.type === 'fill_blank' && q.accepted_answers) {
          const ansStr = String(ans).trim().toLowerCase()
          if (q.accepted_answers.some(a => a.toLowerCase() === ansStr)) earned += q.points
        } else if (q.type === 'ranking' && q.items) {
          const ansArr = ans as string[]
          const isCorrect = Array.isArray(ansArr) && ansArr.every((item, i) => item === q.items![i])
          if (isCorrect) earned += q.points
        }
        // Written questions are not auto-scored
      }
    }

    const scorePercent = possible > 0 ? Math.round((earned / possible) * 100) : 0
    const passed = scorePercent >= 70

    // Save to Supabase
    if (isSupabaseConfigured && submission && submission.id !== 'fallback-submission') {
      try {
        await supabase
          .from('submissions')
          .update({
            answers: finalAnswers,
            score: scorePercent,
            passed,
            status: 'completed' as const,
            completed_at: new Date().toISOString(),
          })
          .eq('id', submission.id)
      } catch (err) {
        console.error('Failed to save submission:', err)
      }
    }
  }, [submission])

  const handleAutoSubmit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    scoreAndSave(answers)
    setScreen('done')
  }, [answers, scoreAndSave])

  useEffect(() => {
    if (screen !== 'quiz') return

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [screen, handleAutoSubmit])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const totalSeconds = (assessment.time_limit ?? 20) * 60
  const timerProgress = totalSeconds > 0 ? secondsLeft / totalSeconds : 1
  const timerColor = secondsLeft < 60 ? 'var(--danger)' : secondsLeft < 120 ? 'var(--accent)' : 'var(--navy)'

  /* ---------------------------------------------------------------- */
  /*  Answer handlers                                                  */
  /* ---------------------------------------------------------------- */

  function setAnswer(questionId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function moveRankingItem(questionId: string, items: string[], fromIdx: number, direction: 'up' | 'down') {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1
    if (toIdx < 0 || toIdx >= items.length) return
    const copy = [...items]
    const temp = copy[fromIdx]
    copy[fromIdx] = copy[toIdx]
    copy[toIdx] = temp
    setAnswer(questionId, copy)
  }

  /* ---------------------------------------------------------------- */
  /*  Navigation                                                       */
  /* ---------------------------------------------------------------- */

  function goToQuestion(idx: number) {
    if (idx >= 0 && idx < totalQuestions) setCurrentIndex(idx)
  }

  function handleNext() {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setShowSubmitModal(true)
    }
  }

  function handlePrev() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  function handleSubmit() {
    if (timerRef.current) clearInterval(timerRef.current)
    setShowSubmitModal(false)
    scoreAndSave(answers)
    setScreen('done')
  }

  /* ---------------------------------------------------------------- */
  /*  Loading state                                                    */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <>
        <style jsx>{`
          .assess-loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--offwhite);
            color: var(--text-mut);
            font-size: 15px;
          }
        `}</style>
        <div className="assess-loading anim-fade">Loading assessment...</div>
      </>
    )
  }

  /* ================================================================ */
  /*  SCREEN: Error                                                    */
  /* ================================================================ */

  if (screen === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--offwhite)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ background: 'var(--white)', border: '1px solid var(--border-light)', borderRadius: 20, padding: '56px 44px', width: '100%', maxWidth: 520, textAlign: 'center' }} className="anim-up">
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: 'var(--navy)', marginBottom: 8 }}>Assessment Not Found</h1>
          <p style={{ fontSize: 14, color: 'var(--text-mut)', lineHeight: 1.5, marginBottom: 32 }}>
            This assessment link is invalid or has expired. Please contact your recruiter for a new link.
          </p>
          <a href="/" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '14px 32px', background: 'var(--navy)', color: 'var(--offwhite)', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Back to Home
            </button>
          </a>
        </div>
      </div>
    )
  }

  /* ================================================================ */
  /*  SCREEN: Identify                                                 */
  /* ================================================================ */

  if (screen === 'identify') {
    return (
      <>
        <style jsx>{`
          .identify-page {
            min-height: 100vh;
            background: var(--offwhite);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
          }
          .identify-card {
            background: var(--white);
            border: 1px solid var(--border-light);
            border-radius: 20px;
            padding: 48px 44px;
            width: 100%;
            max-width: 460px;
          }
          .identify-logo {
            font-family: 'DM Serif Display', serif;
            font-size: 20px;
            color: var(--navy);
            margin-bottom: 32px;
            letter-spacing: -0.3px;
          }
          .identify-title {
            font-family: 'DM Serif Display', serif;
            font-size: 24px;
            color: var(--navy);
            margin-bottom: 8px;
          }
          .identify-subtitle {
            font-size: 14px;
            color: var(--text-mut);
            margin-bottom: 32px;
            line-height: 1.5;
          }
          .identify-label {
            font-size: 13px;
            font-weight: 600;
            color: var(--navy);
            margin-bottom: 6px;
            display: block;
          }
          .identify-input {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid var(--border-light);
            border-radius: 12px;
            font-size: 14px;
            color: var(--text);
            background: var(--white);
            outline: none;
            transition: border-color 0.2s;
            margin-bottom: 20px;
          }
          .identify-input:focus {
            border-color: var(--accent);
          }
          .identify-btn {
            width: 100%;
            padding: 14px 24px;
            background: var(--navy);
            color: var(--offwhite);
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
            margin-top: 8px;
          }
          .identify-btn:hover {
            background: var(--navy-hover);
          }
        `}</style>

        <div className="identify-page">
          <div className="identify-card anim-up">
            <div className="identify-logo">HKR.TEAM</div>
            <h1 className="identify-title">Confirm Your Identity</h1>
            <p className="identify-subtitle">
              Please verify your details before starting the assessment.
            </p>

            <label className="identify-label">Full Name</label>
            <input
              className="identify-input"
              type="text"
              value={identifyName}
              onChange={(e) => setIdentifyName(e.target.value)}
              placeholder="Your full name"
            />

            <label className="identify-label">Email Address</label>
            <input
              className="identify-input"
              type="email"
              value={identifyEmail}
              onChange={(e) => setIdentifyEmail(e.target.value)}
              placeholder="your@email.com"
            />

            <button
              className="identify-btn"
              onClick={() => setScreen('welcome')}
              disabled={!identifyName.trim() || !identifyEmail.trim()}
              style={{ opacity: !identifyName.trim() || !identifyEmail.trim() ? 0.5 : 1 }}
            >
              Continue
            </button>
          </div>
        </div>
      </>
    )
  }

  /* ================================================================ */
  /*  SCREEN: Welcome                                                  */
  /* ================================================================ */

  if (screen === 'welcome') {
    return (
      <>
        <style jsx>{`
          .welcome-page {
            min-height: 100vh;
            background: var(--offwhite);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
          }
          .welcome-card {
            background: var(--white);
            border: 1px solid var(--border-light);
            border-radius: 20px;
            padding: 48px 44px;
            width: 100%;
            max-width: 560px;
          }
          .welcome-logo {
            font-family: 'DM Serif Display', serif;
            font-size: 20px;
            color: var(--navy);
            margin-bottom: 32px;
            letter-spacing: -0.3px;
          }
          .welcome-title {
            font-family: 'DM Serif Display', serif;
            font-size: 26px;
            color: var(--navy);
            margin-bottom: 6px;
          }
          .welcome-role {
            font-size: 14px;
            color: var(--text-mut);
            margin-bottom: 28px;
          }
          .welcome-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 28px;
          }
          .welcome-stat {
            background: var(--cream);
            border-radius: 12px;
            padding: 16px;
            text-align: center;
          }
          .welcome-stat-value {
            font-family: 'DM Serif Display', serif;
            font-size: 22px;
            color: var(--navy);
            margin-bottom: 2px;
          }
          .welcome-stat-label {
            font-size: 11px;
            color: var(--text-mut);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
          }
          .welcome-rules {
            margin-bottom: 32px;
          }
          .welcome-rules-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--navy);
            margin-bottom: 12px;
          }
          .welcome-rule {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            font-size: 13px;
            color: var(--text-sec);
            line-height: 1.5;
            margin-bottom: 10px;
          }
          .welcome-rule-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--accent);
            flex-shrink: 0;
            margin-top: 6px;
          }
          .welcome-btn {
            width: 100%;
            padding: 14px 24px;
            background: var(--navy);
            color: var(--offwhite);
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
          }
          .welcome-btn:hover {
            background: var(--navy-hover);
          }
        `}</style>

        <div className="welcome-page">
          <div className="welcome-card anim-up">
            <div className="welcome-logo">HKR.TEAM</div>
            <h1 className="welcome-title">{assessment.title}</h1>
            <p className="welcome-role">Role: {assessment.role}</p>

            <div className="welcome-stats">
              <div className="welcome-stat">
                <div className="welcome-stat-value">{assessment.time_limit}</div>
                <div className="welcome-stat-label">Minutes</div>
              </div>
              <div className="welcome-stat">
                <div className="welcome-stat-value">{totalQuestions}</div>
                <div className="welcome-stat-label">Questions</div>
              </div>
              <div className="welcome-stat">
                <div className="welcome-stat-value">{totalPoints}</div>
                <div className="welcome-stat-label">Points</div>
              </div>
            </div>

            <div className="welcome-rules">
              <div className="welcome-rules-title">Before you begin</div>
              <div className="welcome-rule">
                <div className="welcome-rule-dot" />
                <span>The timer starts as soon as you click &quot;Begin Assessment&quot; and cannot be paused.</span>
              </div>
              <div className="welcome-rule">
                <div className="welcome-rule-dot" />
                <span>You can navigate between questions freely using the sidebar or navigation buttons.</span>
              </div>
              <div className="welcome-rule">
                <div className="welcome-rule-dot" />
                <span>Your answers are saved automatically as you progress through the assessment.</span>
              </div>
              <div className="welcome-rule">
                <div className="welcome-rule-dot" />
                <span>The assessment will auto-submit when the time runs out.</span>
              </div>
              <div className="welcome-rule">
                <div className="welcome-rule-dot" />
                <span>Make sure you have a stable internet connection before starting.</span>
              </div>
            </div>

            <button className="welcome-btn" onClick={() => setScreen('quiz')}>
              Begin Assessment
            </button>
          </div>
        </div>
      </>
    )
  }

  /* ================================================================ */
  /*  SCREEN: Done                                                     */
  /* ================================================================ */

  if (screen === 'done') {
    return (
      <>
        <style jsx>{`
          .done-page {
            min-height: 100vh;
            background: var(--offwhite);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
          }
          .done-card {
            background: var(--white);
            border: 1px solid var(--border-light);
            border-radius: 20px;
            padding: 56px 44px;
            width: 100%;
            max-width: 520px;
            text-align: center;
          }
          .done-check {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: var(--success-light);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
          }
          .done-check svg {
            color: var(--success);
          }
          .done-title {
            font-family: 'DM Serif Display', serif;
            font-size: 26px;
            color: var(--navy);
            margin-bottom: 8px;
          }
          .done-subtitle {
            font-size: 14px;
            color: var(--text-mut);
            margin-bottom: 32px;
            line-height: 1.5;
          }
          .done-info {
            background: var(--cream);
            border-radius: 14px;
            padding: 24px;
            text-align: left;
            margin-bottom: 32px;
          }
          .done-info-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--navy);
            margin-bottom: 10px;
          }
          .done-info-text {
            font-size: 13px;
            color: var(--text-sec);
            line-height: 1.6;
          }
          .done-btn {
            padding: 14px 32px;
            background: var(--navy);
            color: var(--offwhite);
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
          }
          .done-btn:hover {
            background: var(--navy-hover);
          }
        `}</style>

        <div className="done-page">
          <div className="done-card anim-up">
            <div className="done-check">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="done-title">Assessment Submitted</h1>
            <p className="done-subtitle">
              Thank you for completing the {assessment.title}. Your responses have been recorded successfully.
            </p>

            <div className="done-info">
              <div className="done-info-title">What happens next?</div>
              <div className="done-info-text">
                Your responses will be reviewed by the assessment team. You will be notified by email
                once results are available. This typically takes 2-3 business days.
              </div>
            </div>

            <a href="/" style={{ textDecoration: 'none' }}>
              <button className="done-btn">Back to Platform</button>
            </a>
          </div>
        </div>
      </>
    )
  }

  /* ================================================================ */
  /*  SCREEN: Quiz                                                     */
  /* ================================================================ */

  /* --- Build sidebar section data --- */
  const sidebarSections: { title: string; questions: { id: string; globalIndex: number }[] }[] = []
  let gIdx = 0
  for (const sec of assessment.sections) {
    const sqs: { id: string; globalIndex: number }[] = []
    for (const q of sec.questions) {
      sqs.push({ id: q.id, globalIndex: gIdx })
      gIdx++
    }
    sidebarSections.push({ title: sec.title, questions: sqs })
  }

  /* --- Current question data --- */
  const q = current.question
  const currentAnswer = answers[q.id]

  /* --- Ranking items: use answer state or original items --- */
  const rankingItems: string[] =
    q.type === 'ranking'
      ? (currentAnswer as string[] | undefined) ?? q.items ?? []
      : []

  return (
    <>
      <style jsx>{`
        /* ---- Layout ---- */
        .quiz-page {
          min-height: 100vh;
          background: var(--offwhite);
          display: flex;
          flex-direction: column;
        }

        /* ---- Top Bar ---- */
        .quiz-topbar {
          background: var(--white);
          border-bottom: 1px solid var(--border-light);
          padding: 0 28px;
          height: 60px;
          display: flex;
          align-items: center;
          gap: 20px;
          flex-shrink: 0;
        }
        .quiz-topbar-logo {
          font-family: 'DM Serif Display', serif;
          font-size: 18px;
          color: var(--navy);
          letter-spacing: -0.3px;
          flex-shrink: 0;
        }
        .quiz-topbar-divider {
          width: 1px;
          height: 28px;
          background: var(--border-light);
          flex-shrink: 0;
        }
        .quiz-topbar-info {
          flex: 1;
          min-width: 0;
        }
        .quiz-topbar-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--navy);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .quiz-topbar-role {
          font-size: 12px;
          color: var(--text-mut);
        }
        .quiz-topbar-answered {
          font-size: 13px;
          color: var(--text-sec);
          flex-shrink: 0;
          font-weight: 500;
        }
        .quiz-topbar-answered strong {
          color: var(--navy);
        }

        /* Timer */
        .quiz-timer {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .quiz-timer-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 15px;
          font-weight: 500;
          min-width: 52px;
          text-align: right;
        }
        .quiz-timer-bar-track {
          width: 100px;
          height: 6px;
          background: var(--tusk);
          border-radius: 3px;
          overflow: hidden;
        }
        .quiz-timer-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 1s linear;
        }

        /* ---- Body ---- */
        .quiz-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* ---- Sidebar ---- */
        .quiz-sidebar {
          width: 200px;
          background: var(--white);
          border-right: 1px solid var(--border-light);
          padding: 24px 16px;
          overflow-y: auto;
          flex-shrink: 0;
        }
        .quiz-sidebar-section {
          margin-bottom: 24px;
        }
        .quiz-sidebar-section:last-child {
          margin-bottom: 0;
        }
        .quiz-sidebar-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: var(--text-mut);
          margin-bottom: 10px;
          padding: 0 2px;
        }
        .quiz-sidebar-dots {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .quiz-sidebar-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 2px solid var(--border-light);
          background: var(--white);
          color: var(--text-mut);
          transition: all 0.15s;
        }
        .quiz-sidebar-dot:hover {
          border-color: var(--border);
        }
        .quiz-sidebar-dot.active {
          background: var(--navy);
          border-color: var(--navy);
          color: var(--offwhite);
        }
        .quiz-sidebar-dot.answered {
          background: var(--success-light);
          border-color: var(--success);
          color: var(--success);
        }

        /* ---- Main ---- */
        .quiz-main {
          flex: 1;
          padding: 36px 48px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .quiz-question-card {
          background: var(--white);
          border: 1px solid var(--border-light);
          border-radius: 20px;
          padding: 36px;
          flex: 1;
        }
        .quiz-section-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: var(--text-mut);
          margin-bottom: 6px;
        }
        .quiz-question-num {
          font-family: 'DM Serif Display', serif;
          font-size: 20px;
          color: var(--navy);
          margin-bottom: 16px;
        }
        .quiz-question-text {
          font-size: 15px;
          color: var(--text);
          line-height: 1.6;
          margin-bottom: 28px;
        }

        /* MC Options */
        .mc-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .mc-option {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 15px 18px;
          border: 2px solid var(--border-light);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.15s;
          background: var(--white);
        }
        .mc-option:hover {
          border-color: var(--border);
        }
        .mc-option.selected {
          background: var(--tusk);
          border-color: var(--navy);
        }
        .mc-option-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-sec);
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .mc-option.selected .mc-option-dot {
          background: var(--navy);
          border-color: var(--navy);
          color: var(--offwhite);
        }
        .mc-option-text {
          font-size: 14px;
          color: var(--text);
          line-height: 1.4;
        }

        /* Fill blank */
        .fill-input {
          width: 100%;
          padding: 14px 18px;
          border: 2px solid var(--border-light);
          border-radius: 14px;
          font-size: 15px;
          color: var(--text);
          outline: none;
          transition: border-color 0.2s;
          background: var(--white);
        }
        .fill-input:focus {
          border-color: var(--accent);
        }

        /* Written */
        .written-area {
          width: 100%;
          min-height: 180px;
          padding: 16px 18px;
          border: 2px solid var(--border-light);
          border-radius: 14px;
          font-size: 14px;
          color: var(--text);
          outline: none;
          transition: border-color 0.2s;
          resize: vertical;
          line-height: 1.6;
          background: var(--white);
        }
        .written-area:focus {
          border-color: var(--accent);
        }
        .written-counter {
          font-size: 12px;
          color: var(--text-mut);
          margin-top: 8px;
          text-align: right;
        }
        .written-counter.warn {
          color: var(--danger);
        }

        /* Ranking */
        .ranking-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ranking-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--white);
          border: 1px solid var(--border-light);
          border-radius: 14px;
          transition: box-shadow 0.15s;
        }
        .ranking-item:hover {
          box-shadow: 0 2px 8px rgba(6, 5, 52, 0.05);
        }
        .ranking-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--navy);
          color: var(--offwhite);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .ranking-text {
          flex: 1;
          font-size: 14px;
          color: var(--text);
        }
        .ranking-arrows {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex-shrink: 0;
        }
        .ranking-arrow {
          width: 26px;
          height: 20px;
          border: 1px solid var(--border-light);
          border-radius: 6px;
          background: var(--white);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-mut);
          transition: all 0.15s;
          font-size: 10px;
        }
        .ranking-arrow:hover {
          border-color: var(--border);
          color: var(--navy);
          background: var(--cream);
        }
        .ranking-arrow.disabled {
          opacity: 0.3;
          cursor: default;
        }
        .ranking-arrow.disabled:hover {
          border-color: var(--border-light);
          color: var(--text-mut);
          background: var(--white);
        }

        /* ---- Nav ---- */
        .quiz-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 48px;
          border-top: 1px solid var(--border-light);
          background: var(--white);
          flex-shrink: 0;
        }
        .quiz-nav-btn {
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        .quiz-nav-prev {
          background: var(--cream);
          color: var(--text-sec);
        }
        .quiz-nav-prev:hover {
          background: var(--border-light);
        }
        .quiz-nav-prev:disabled {
          opacity: 0.4;
          cursor: default;
        }
        .quiz-nav-next {
          background: var(--navy);
          color: var(--offwhite);
        }
        .quiz-nav-next:hover {
          background: var(--navy-hover);
        }
        .quiz-nav-submit {
          background: var(--success);
          color: var(--white);
        }
        .quiz-nav-submit:hover {
          opacity: 0.9;
        }

        /* ---- Submit modal ---- */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(6, 5, 52, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }
        .modal-card {
          background: var(--white);
          border-radius: 20px;
          padding: 40px;
          max-width: 440px;
          width: 100%;
        }
        .modal-title {
          font-family: 'DM Serif Display', serif;
          font-size: 22px;
          color: var(--navy);
          margin-bottom: 12px;
        }
        .modal-text {
          font-size: 14px;
          color: var(--text-sec);
          line-height: 1.5;
          margin-bottom: 8px;
        }
        .modal-warn {
          font-size: 13px;
          color: var(--danger);
          margin-bottom: 24px;
          font-weight: 500;
        }
        .modal-answered {
          font-size: 14px;
          color: var(--text);
          margin-bottom: 20px;
          font-weight: 600;
        }
        .modal-btns {
          display: flex;
          gap: 10px;
        }
        .modal-cancel {
          flex: 1;
          padding: 12px 20px;
          border: 1px solid var(--border-light);
          border-radius: 12px;
          background: var(--white);
          color: var(--text-sec);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .modal-cancel:hover {
          background: var(--cream);
        }
        .modal-confirm {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 12px;
          background: var(--navy);
          color: var(--offwhite);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .modal-confirm:hover {
          background: var(--navy-hover);
        }
      `}</style>

      <div className="quiz-page">
        {/* ---- Top Bar ---- */}
        <div className="quiz-topbar">
          <div className="quiz-topbar-logo">HKR.TEAM</div>
          <div className="quiz-topbar-divider" />
          <div className="quiz-topbar-info">
            <div className="quiz-topbar-title">{assessment.title}</div>
            <div className="quiz-topbar-role">{assessment.role}</div>
          </div>
          <div className="quiz-topbar-answered">
            <strong>{answeredCount}</strong> / {totalQuestions} answered
          </div>
          <div className="quiz-topbar-divider" />
          <div className="quiz-timer">
            <div className="quiz-timer-bar-track">
              <div
                className="quiz-timer-bar-fill"
                style={{
                  width: `${timerProgress * 100}%`,
                  background: timerColor,
                }}
              />
            </div>
            <div className="quiz-timer-text" style={{ color: timerColor }}>
              {timeStr}
            </div>
          </div>
        </div>

        <div className="quiz-body">
          {/* ---- Sidebar ---- */}
          <div className="quiz-sidebar">
            {sidebarSections.map((sec, si) => (
              <div key={si} className="quiz-sidebar-section">
                <div className="quiz-sidebar-label">{sec.title}</div>
                <div className="quiz-sidebar-dots">
                  {sec.questions.map((sq) => {
                    const isActive = sq.globalIndex === currentIndex
                    const isAnswered = answers[sq.id] !== undefined
                    let cls = 'quiz-sidebar-dot'
                    if (isActive) cls += ' active'
                    else if (isAnswered) cls += ' answered'
                    return (
                      <div
                        key={sq.id}
                        className={cls}
                        onClick={() => goToQuestion(sq.globalIndex)}
                      >
                        {sq.globalIndex + 1}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ---- Main ---- */}
          <div className="quiz-main">
            <div className="quiz-question-card anim-fade" key={currentIndex}>
              <div className="quiz-section-label">{current.section}</div>
              <div className="quiz-question-num">
                Question {currentIndex + 1} of {totalQuestions}
              </div>
              <div className="quiz-question-text">{q.text}</div>

              {/* --- Multiple Choice --- */}
              {q.type === 'multiple_choice' && q.options && (
                <div className="mc-options">
                  {q.options.map((opt, oi) => {
                    const isSelected = currentAnswer === oi
                    return (
                      <div
                        key={oi}
                        className={`mc-option${isSelected ? ' selected' : ''}`}
                        onClick={() => setAnswer(q.id, oi)}
                      >
                        <div className="mc-option-dot">
                          {isSelected ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            OPTION_LETTERS[oi]
                          )}
                        </div>
                        <div className="mc-option-text">{opt}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* --- Fill Blank --- */}
              {q.type === 'fill_blank' && (
                <input
                  className="fill-input"
                  type="text"
                  placeholder="Type your answer..."
                  value={(currentAnswer as string) ?? ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                />
              )}

              {/* --- Written --- */}
              {q.type === 'written' && (
                <div>
                  <textarea
                    className="written-area"
                    placeholder="Write your answer here..."
                    value={(currentAnswer as string) ?? ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                  />
                  <div
                    className={`written-counter${
                      q.min_words && countWords((currentAnswer as string) ?? '') < q.min_words
                        ? ' warn'
                        : ''
                    }`}
                  >
                    {countWords((currentAnswer as string) ?? '')} words
                    {q.min_words ? ` (min: ${q.min_words})` : ''}
                  </div>
                </div>
              )}

              {/* --- Ranking --- */}
              {q.type === 'ranking' && (
                <div className="ranking-list">
                  {rankingItems.map((item, ri) => (
                    <div key={item} className="ranking-item">
                      <div className="ranking-num">{ri + 1}</div>
                      <div className="ranking-text">{item}</div>
                      <div className="ranking-arrows">
                        <div
                          className={`ranking-arrow${ri === 0 ? ' disabled' : ''}`}
                          onClick={() => {
                            if (ri > 0) moveRankingItem(q.id, rankingItems, ri, 'up')
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        </div>
                        <div
                          className={`ranking-arrow${ri === rankingItems.length - 1 ? ' disabled' : ''}`}
                          onClick={() => {
                            if (ri < rankingItems.length - 1) moveRankingItem(q.id, rankingItems, ri, 'down')
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---- Navigation ---- */}
        <div className="quiz-nav">
          <button
            className="quiz-nav-btn quiz-nav-prev"
            disabled={currentIndex === 0}
            onClick={handlePrev}
          >
            Previous
          </button>

          {currentIndex === totalQuestions - 1 ? (
            <button
              className="quiz-nav-btn quiz-nav-submit"
              onClick={() => setShowSubmitModal(true)}
            >
              Submit Assessment
            </button>
          ) : (
            <button className="quiz-nav-btn quiz-nav-next" onClick={handleNext}>
              Next
            </button>
          )}
        </div>

        {/* ---- Submit Modal ---- */}
        {showSubmitModal && (
          <div className="modal-overlay anim-fade" onClick={() => setShowSubmitModal(false)}>
            <div className="modal-card anim-slide" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal-title">Submit Assessment</h2>
              <p className="modal-text">
                Are you sure you want to submit your assessment? You will not be able to make changes after submission.
              </p>
              <div className="modal-answered">
                {answeredCount} of {totalQuestions} questions answered
              </div>
              {answeredCount < totalQuestions && (
                <div className="modal-warn">
                  You have {totalQuestions - answeredCount} unanswered question
                  {totalQuestions - answeredCount !== 1 ? 's' : ''}. Unanswered questions will receive zero points.
                </div>
              )}
              <div className="modal-btns">
                <button className="modal-cancel" onClick={() => setShowSubmitModal(false)}>
                  Go Back
                </button>
                <button className="modal-confirm" onClick={handleSubmit}>
                  Confirm &amp; Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
