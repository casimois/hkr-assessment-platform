'use client'

import { useEffect, useState, use } from 'react'
import { supabase, type Section, type Question } from '@/lib/supabase'
import { hasPooling } from '@/lib/question-pool'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AssessmentData {
  id: string
  title: string
  role: string
  type: 'scoring' | 'open'
  time_limit: number
  pass_threshold: number | null
  sections: Section[]
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

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [assessment, setAssessment] = useState<AssessmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('assessments')
          .select('*')
          .eq('id', id)
          .single()
        if (error || !data) throw error
        setAssessment(data as AssessmentData)
      } catch {
        /* will show not found */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  /* Toggle body scroll lock when sidebar drawer is open */
  useEffect(() => {
    if (sidebarOpen) document.body.classList.add('sidebar-open')
    else document.body.classList.remove('sidebar-open')
    return () => document.body.classList.remove('sidebar-open')
  }, [sidebarOpen])

  /* ---------------------------------------------------------------- */
  /*  Loading / Error                                                  */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--offwhite)', color: 'var(--text-mut)', fontSize: 15 }}>
        Loading preview...
      </div>
    )
  }

  if (!assessment || assessment.sections.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--offwhite)', gap: 12 }}>
        <div style={{ fontSize: 28 }}>📝</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)' }}>No questions to preview</div>
        <div style={{ fontSize: 14, color: 'var(--text-mut)' }}>Add questions in the builder first.</div>
        <a href={`/admin/assessments/${id}/edit`} style={{ marginTop: 8, fontSize: 14, color: 'var(--navy)', fontWeight: 600 }}>
          &larr; Back to Builder
        </a>
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Derived data                                                     */
  /* ---------------------------------------------------------------- */

  const allQuestions = getAllQuestions(assessment.sections)
  const totalQuestions = allQuestions.length
  const current = allQuestions[currentIndex]
  const answeredCount = Object.keys(answers).length

  /* ---------------------------------------------------------------- */
  /*  Sidebar sections                                                 */
  /* ---------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------- */
  /*  Answer handlers (preview — no saving)                            */
  /* ---------------------------------------------------------------- */

  const q = current.question
  const currentAnswer = answers[q.id]

  function setAnswer(questionId: string, value: unknown) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
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

  const rankingItems: string[] =
    q.type === 'ranking'
      ? (currentAnswer as string[] | undefined) ?? q.items ?? []
      : []

  /* ---------------------------------------------------------------- */
  /*  Navigation                                                       */
  /* ---------------------------------------------------------------- */

  function goToQuestion(idx: number) {
    if (idx >= 0 && idx < totalQuestions) setCurrentIndex(idx)
  }

  function handleNext() {
    if (currentIndex < totalQuestions - 1) setCurrentIndex(currentIndex + 1)
  }

  function handlePrev() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <>
      <style jsx>{`
        /* ---- Layout ---- */
        .preview-page {
          min-height: 100vh;
          background: var(--offwhite);
          display: flex;
          flex-direction: column;
        }

        /* ---- Preview banner ---- */
        .preview-banner {
          background: var(--accent);
          color: var(--navy);
          text-align: center;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .preview-banner a {
          color: var(--navy);
          text-decoration: underline;
          font-weight: 700;
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
        .quiz-topbar-menu {
          display: none;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--border-light);
          background: var(--white);
          color: var(--navy);
          cursor: pointer;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .quiz-topbar-progress-mobile {
          display: none;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-sec);
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

        /* Timer placeholder */
        .quiz-timer-preview {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          opacity: 0.4;
        }
        .quiz-timer-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 15px;
          font-weight: 500;
          color: var(--navy);
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
        .quiz-sidebar-section { margin-bottom: 24px; }
        .quiz-sidebar-section:last-child { margin-bottom: 0; }
        .quiz-sidebar-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: var(--text-mut);
          margin-bottom: 10px;
          padding: 0 2px;
        }
        .quiz-sidebar-dots { display: flex; flex-wrap: wrap; gap: 6px; }
        .quiz-sidebar-dot {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 600; cursor: pointer;
          border: 2px solid var(--border-light);
          background: var(--white); color: var(--text-mut);
          transition: all 0.15s;
        }
        .quiz-sidebar-dot:hover { border-color: var(--border); }
        .quiz-sidebar-dot.active { background: var(--navy); border-color: var(--navy); color: var(--offwhite); }
        .quiz-sidebar-dot.answered { background: var(--success-light); border-color: var(--success); color: var(--success); }

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
          font-size: 11px; font-weight: 700; letter-spacing: 0.8px;
          text-transform: uppercase; color: var(--text-mut); margin-bottom: 6px;
        }
        .quiz-question-num {
          font-family: 'DM Serif Display', serif;
          font-size: 20px; color: var(--navy); margin-bottom: 16px;
        }
        .quiz-question-text {
          font-size: 15px; color: var(--text); line-height: 1.6; margin-bottom: 28px;
        }

        /* MC Options */
        .mc-options { display: flex; flex-direction: column; gap: 10px; }
        .mc-option {
          display: flex; align-items: center; gap: 14px;
          padding: 15px 18px; border: 2px solid var(--border-light);
          border-radius: 16px; cursor: pointer; transition: all 0.15s; background: var(--white);
        }
        .mc-option:hover { border-color: var(--border); }
        .mc-option.selected { background: var(--tusk); border-color: var(--navy); }
        .mc-option-dot {
          width: 28px; height: 28px; border-radius: 50%;
          border: 2px solid var(--border-light);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: var(--text-sec);
          flex-shrink: 0; transition: all 0.15s;
        }
        .mc-option.selected .mc-option-dot { background: var(--navy); border-color: var(--navy); color: var(--offwhite); }
        .mc-option-text { font-size: 14px; color: var(--text); line-height: 1.4; }

        /* Fill blank */
        .fill-input {
          width: 100%; padding: 14px 18px;
          border: 2px solid var(--border-light); border-radius: 14px;
          font-size: 15px; color: var(--text); outline: none;
          transition: border-color 0.2s; background: var(--white);
        }
        .fill-input:focus { border-color: var(--accent); }

        /* Written */
        .written-area {
          width: 100%; min-height: 180px; padding: 16px 18px;
          border: 2px solid var(--border-light); border-radius: 14px;
          font-size: 14px; color: var(--text); outline: none;
          transition: border-color 0.2s; resize: vertical; line-height: 1.6; background: var(--white);
        }
        .written-area:focus { border-color: var(--accent); }
        .written-counter { font-size: 12px; color: var(--text-mut); margin-top: 8px; text-align: right; }
        .written-counter.warn { color: var(--danger); }

        /* Ranking */
        .ranking-list { display: flex; flex-direction: column; gap: 8px; }
        .ranking-item {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px; background: var(--white);
          border: 1px solid var(--border-light); border-radius: 14px;
          transition: box-shadow 0.15s;
        }
        .ranking-item:hover { box-shadow: 0 2px 8px rgba(6, 5, 52, 0.05); }
        .ranking-num {
          width: 28px; height: 28px; border-radius: 50%;
          background: var(--navy); color: var(--offwhite);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; flex-shrink: 0;
        }
        .ranking-text { flex: 1; font-size: 14px; color: var(--text); }
        .ranking-arrows { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
        .ranking-arrow {
          width: 26px; height: 20px;
          border: 1px solid var(--border-light); border-radius: 6px;
          background: var(--white);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--text-mut); transition: all 0.15s; font-size: 10px;
        }
        .ranking-arrow:hover { border-color: var(--border); color: var(--navy); background: var(--cream); }
        .ranking-arrow.disabled { opacity: 0.3; cursor: default; }
        .ranking-arrow.disabled:hover { border-color: var(--border-light); color: var(--text-mut); background: var(--white); }

        /* ---- Nav ---- */
        .quiz-nav {
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 48px; border-top: 1px solid var(--border-light);
          background: var(--white); flex-shrink: 0;
        }
        .quiz-nav-btn {
          padding: 12px 24px; border-radius: 12px; font-size: 14px;
          font-weight: 600; cursor: pointer; transition: all 0.2s; border: none;
        }
        .quiz-nav-prev { background: var(--cream); color: var(--text-sec); }
        .quiz-nav-prev:hover { background: var(--border-light); }
        .quiz-nav-prev:disabled { opacity: 0.4; cursor: default; }
        .quiz-nav-next { background: var(--navy); color: var(--offwhite); }
        .quiz-nav-next:hover { background: var(--navy-hover); }

        /* ---- Sidebar backdrop (mobile) ---- */
        .quiz-sidebar-backdrop { display: none; }

        @media (max-width: 768px) {
          .quiz-topbar { height: 52px; padding: 0 16px; gap: 12px; }
          .quiz-topbar-menu { display: flex; }
          .quiz-topbar-logo, .quiz-topbar-divider, .quiz-topbar-info, .quiz-topbar-answered { display: none; }
          .quiz-topbar-progress-mobile { display: block; flex: 1; }
          .quiz-sidebar {
            position: fixed; top: 0; left: 0; bottom: 0;
            width: 260px; z-index: 90;
            transform: translateX(-100%); transition: transform 0.25s ease; box-shadow: none;
          }
          .quiz-sidebar.open { transform: translateX(0); box-shadow: 4px 0 20px rgba(6,5,52,0.12); }
          .quiz-sidebar-backdrop { display: block; position: fixed; inset: 0; background: rgba(6,5,52,0.3); z-index: 80; }
          .quiz-main { padding: 16px; }
          .quiz-question-card { padding: 20px; border-radius: 16px; }
          .fill-input { font-size: 16px; }
          .written-area { font-size: 16px; min-height: 140px; }
          .ranking-arrow { width: 32px; height: 26px; }
          .quiz-nav { padding: 14px 16px; padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px)); gap: 10px; }
          .quiz-nav-btn { flex: 1; text-align: center; min-height: 44px; }
        }
      `}</style>

      <div className="preview-page">
        {/* ---- Preview Banner ---- */}
        <div className="preview-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Preview Mode &mdash; {hasPooling(assessment.sections)
            ? `Showing all ${totalQuestions} questions. Candidates will receive a random subset of MC/Fill-in-the-blank questions based on pool settings.`
            : 'This is how candidates will see the assessment.'}
          <a href={`/admin/assessments/${id}/edit`}>&larr; Back to Builder</a>
        </div>

        {/* ---- Top Bar ---- */}
        <div className="quiz-topbar">
          <button className="quiz-topbar-menu" onClick={() => setSidebarOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="quiz-topbar-logo">HKR.TEAM</div>
          <div className="quiz-topbar-divider" />
          <div className="quiz-topbar-info">
            <div className="quiz-topbar-title">{assessment.title}</div>
            <div className="quiz-topbar-role">{assessment.role}</div>
          </div>
          <div className="quiz-topbar-progress-mobile">
            {currentIndex + 1} / {totalQuestions}
          </div>
          <div className="quiz-topbar-answered">
            <strong>{answeredCount}</strong> / {totalQuestions} answered
          </div>
          <div className="quiz-topbar-divider" />
          <div className="quiz-timer-preview">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div className="quiz-timer-text">{assessment.time_limit}:00</div>
            <span style={{ fontSize: 11, color: 'var(--text-mut)' }}>(paused)</span>
          </div>
        </div>

        <div className="quiz-body">
          {/* ---- Sidebar backdrop (mobile) ---- */}
          {sidebarOpen && <div className="quiz-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

          {/* ---- Sidebar ---- */}
          <div className={`quiz-sidebar${sidebarOpen ? ' open' : ''}`}>
            {sidebarSections.map((sec, si) => (
              <div key={si} className="quiz-sidebar-section">
                <div className="quiz-sidebar-label">{sec.title}</div>
                <div className="quiz-sidebar-dots">
                  {sec.questions.map(sq => {
                    const isActive = sq.globalIndex === currentIndex
                    const isAnswered = answers[sq.id] !== undefined
                    let cls = 'quiz-sidebar-dot'
                    if (isActive) cls += ' active'
                    else if (isAnswered) cls += ' answered'
                    return (
                      <div key={sq.id} className={cls} onClick={() => { goToQuestion(sq.globalIndex); setSidebarOpen(false) }}>
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
              <div className="quiz-question-num">Question {currentIndex + 1} of {totalQuestions}</div>
              <div className="quiz-question-text">{q.text}</div>

              {/* --- Question Image --- */}
              {q.image_url && (
                <div style={{ margin: '16px 0', textAlign: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={q.image_url} alt="Question image" style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 12, border: '1px solid var(--border-light)' }} />
                </div>
              )}

              {/* --- Multiple Choice --- */}
              {q.type === 'multiple_choice' && q.options && (
                <div className="mc-options">
                  {q.options.map((opt, oi) => {
                    const isSelected = currentAnswer === oi
                    return (
                      <div key={oi} className={`mc-option${isSelected ? ' selected' : ''}`} onClick={() => setAnswer(q.id, oi)}>
                        <div className="mc-option-dot">
                          {isSelected ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : OPTION_LETTERS[oi]}
                        </div>
                        <div className="mc-option-text">{opt}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* --- Fill Blank --- */}
              {q.type === 'fill_blank' && (
                <input className="fill-input" type="text" placeholder="Type your answer..." value={(currentAnswer as string) ?? ''} onChange={e => setAnswer(q.id, e.target.value)} />
              )}

              {/* --- Written --- */}
              {q.type === 'written' && (
                <div>
                  <textarea className="written-area" placeholder="Write your answer here..." value={(currentAnswer as string) ?? ''} onChange={e => setAnswer(q.id, e.target.value)} />
                  <div className={`written-counter${q.min_words && countWords((currentAnswer as string) ?? '') < q.min_words ? ' warn' : ''}`}>
                    {countWords((currentAnswer as string) ?? '')} words{q.min_words ? ` (min: ${q.min_words})` : ''}
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
                        <div className={`ranking-arrow${ri === 0 ? ' disabled' : ''}`} onClick={() => { if (ri > 0) moveRankingItem(q.id, rankingItems, ri, 'up') }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                        </div>
                        <div className={`ranking-arrow${ri === rankingItems.length - 1 ? ' disabled' : ''}`} onClick={() => { if (ri < rankingItems.length - 1) moveRankingItem(q.id, rankingItems, ri, 'down') }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
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
          <button className="quiz-nav-btn quiz-nav-prev" disabled={currentIndex === 0} onClick={handlePrev}>
            Previous
          </button>
          {currentIndex === totalQuestions - 1 ? (
            <a href={`/admin/assessments/${id}/edit`} className="quiz-nav-btn quiz-nav-next" style={{ textDecoration: 'none', textAlign: 'center' }}>
              Exit Preview
            </a>
          ) : (
            <button className="quiz-nav-btn quiz-nav-next" onClick={handleNext}>
              Next
            </button>
          )}
        </div>
      </div>
    </>
  )
}
