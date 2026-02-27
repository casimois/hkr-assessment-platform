'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProjectRow {
  id: string
  name: string
  description: string | null
  client: string | null
  team: string | null
  lever_tag: string | null
  assessment_count: number
}

/* ------------------------------------------------------------------ */
/*  Hardcoded fallback data                                            */
/* ------------------------------------------------------------------ */

const FALLBACK_PROJECTS: ProjectRow[] = [
  {
    id: '1',
    name: 'Client Onboarding',
    description: 'Standard candidate assessments',
    client: 'Acme Corp',
    team: 'Recruiting',
    lever_tag: 'acme-onboard',
    assessment_count: 3,
  },
  {
    id: '2',
    name: 'Talent Pipeline',
    description: 'General screening',
    client: 'TechStart',
    team: 'Engineering',
    lever_tag: null,
    assessment_count: 1,
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>(FALLBACK_PROJECTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*, assessments(id)')

        if (!error && data) {
          setProjects(
            data.map((p: Record<string, unknown>) => ({
              id: p.id as string,
              name: p.name as string,
              description: (p.description as string | null) ?? null,
              client: (p.client as string | null) ?? null,
              team: (p.team as string | null) ?? null,
              lever_tag: (p.lever_tag as string | null) ?? null,
              assessment_count: Array.isArray(p.assessments)
                ? p.assessments.length
                : 0,
            }))
          )
        }
      } catch (err) {
        console.error('Projects fetch error:', err)
        // Falls back to hardcoded data already in state
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  return (
    <>
      <style jsx>{`
        .projects-page {
          max-width: 1320px;
          margin: 0 auto;
        }

        /* Header row */
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .page-header h1 {
          font-family: 'DM Serif Display', serif;
          font-weight: 400;
          font-size: 26px;
          color: var(--navy);
          margin-bottom: 4px;
        }
        .page-header p {
          font-size: 14px;
          color: var(--text-mut);
        }

        /* Primary button */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: var(--navy);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
          white-space: nowrap;
        }
        .btn-primary:hover {
          background: var(--navy-hover);
          transform: translateY(-1px);
        }
        .btn-primary:active {
          transform: translateY(0);
        }

        /* Card wrapper */
        .card {
          background: var(--white);
          border: 1px solid var(--border-light);
          border-radius: 14px;
          overflow: hidden;
        }

        /* Table */
        .table-wrap {
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 720px;
        }
        thead th {
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--text-mut);
          padding: 14px 20px;
          border-bottom: 1px solid var(--border-light);
          white-space: nowrap;
        }
        tbody td {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-light);
          font-size: 14px;
          color: var(--text-sec);
          vertical-align: middle;
        }
        tbody tr:last-child td {
          border-bottom: none;
        }
        tbody tr:hover {
          background: var(--cream);
        }

        /* Project name cell */
        .project-name {
          font-weight: 600;
          color: var(--navy);
          margin-bottom: 2px;
        }
        .project-desc {
          font-size: 12px;
          color: var(--text-mut);
        }

        /* Lever tag */
        .lever-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          background: var(--cream);
          color: var(--text-sec);
          padding: 3px 10px;
          border-radius: 6px;
          border: 1px solid var(--border-light);
          display: inline-block;
        }
        .no-tag {
          font-size: 12px;
          color: var(--text-mut);
        }

        /* Assessment count pill */
        .count-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 24px;
          padding: 0 8px;
          background: var(--tusk);
          border: 1px solid var(--border-light);
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          color: var(--navy);
        }

        /* Edit button */
        .btn-edit {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 14px;
          background: transparent;
          color: var(--text-sec);
          font-size: 12px;
          font-weight: 500;
          border: 1px solid var(--border-light);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-edit:hover {
          background: var(--cream);
          border-color: var(--border);
          color: var(--navy);
        }

        /* Skeleton loader */
        .skeleton {
          background: linear-gradient(90deg, var(--cream) 25%, var(--border-light) 50%, var(--cream) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 6px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Empty state */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-mut);
        }
        .empty-state p {
          font-size: 14px;
          margin-bottom: 16px;
        }
      `}</style>

      <div className="projects-page anim-up">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1>Projects</h1>
            <p>Organize assessments by client or initiative</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => alert('New Project dialog coming soon')}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            New Project
          </button>
        </div>

        {/* Table card */}
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Client</th>
                  <th>Team</th>
                  <th>Lever Tag</th>
                  <th>Assessments</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td>
                        <div className="skeleton" style={{ width: 160, height: 14, marginBottom: 6 }} />
                        <div className="skeleton" style={{ width: 200, height: 10 }} />
                      </td>
                      <td><div className="skeleton" style={{ width: 80, height: 14 }} /></td>
                      <td><div className="skeleton" style={{ width: 80, height: 14 }} /></td>
                      <td><div className="skeleton" style={{ width: 100, height: 22 }} /></td>
                      <td><div className="skeleton" style={{ width: 28, height: 24, borderRadius: 100 }} /></td>
                      <td><div className="skeleton" style={{ width: 56, height: 28, borderRadius: 8 }} /></td>
                    </tr>
                  ))
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <p>No projects yet. Create one to organize your assessments.</p>
                        <button
                          className="btn-primary"
                          onClick={() => alert('New Project dialog coming soon')}
                        >
                          Create First Project
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <div className="project-name">{project.name}</div>
                        {project.description && (
                          <div className="project-desc">{project.description}</div>
                        )}
                      </td>
                      <td>{project.client ?? <span className="no-tag">&mdash;</span>}</td>
                      <td>{project.team ?? <span className="no-tag">&mdash;</span>}</td>
                      <td>
                        {project.lever_tag ? (
                          <span className="lever-tag">{project.lever_tag}</span>
                        ) : (
                          <span className="no-tag">&mdash;</span>
                        )}
                      </td>
                      <td>
                        <span className="count-pill">{project.assessment_count}</span>
                      </td>
                      <td>
                        <button
                          className="btn-edit"
                          onClick={() => alert(`Edit project: ${project.name}`)}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
