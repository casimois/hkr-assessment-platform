'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ProjectRow {
  id: string
  name: string
  description: string | null
  client: string | null
  team: string | null
  lever_tag: string | null
  assessment_count: number
}

const FALLBACK_PROJECTS: ProjectRow[] = [
  { id: '1', name: 'Client Onboarding', description: 'Standard candidate assessments', client: 'Acme Corp', team: 'Recruiting', lever_tag: 'acme-onboard', assessment_count: 3 },
  { id: '2', name: 'Talent Pipeline', description: 'General screening', client: 'TechStart', team: 'Engineering', lever_tag: null, assessment_count: 1 },
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>(FALLBACK_PROJECTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data, error } = await supabase.from('projects').select('*, assessments(id)')
        if (!error && data) {
          setProjects(data.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string,
            description: (p.description as string | null) ?? null,
            client: (p.client as string | null) ?? null,
            team: (p.team as string | null) ?? null,
            lever_tag: (p.lever_tag as string | null) ?? null,
            assessment_count: Array.isArray(p.assessments) ? p.assessments.length : 0,
          })))
        }
      } catch (err) {
        console.error('Projects fetch error:', err)
      } finally { setLoading(false) }
    }
    fetchProjects()
  }, [])

  return (
    <div className="anim-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, color: 'var(--navy)', marginBottom: 4 }}>Projects</h1>
          <p style={{ fontSize: 14, color: 'var(--text-mut)' }}>Organize assessments by client or initiative</p>
        </div>
        <button className="btn btn-primary" onClick={() => alert('New Project dialog coming soon')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          New Project
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 720 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                {["Project", "Client", "Team", "Lever Tag", "Assessments", ""].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '14px 20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-mut)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '16px 20px' }}><div className="skeleton" style={{ width: 160, height: 14, marginBottom: 6 }} /><div className="skeleton" style={{ width: 200, height: 10 }} /></td>
                    <td style={{ padding: '16px 20px' }}><div className="skeleton" style={{ width: 80, height: 14 }} /></td>
                    <td style={{ padding: '16px 20px' }}><div className="skeleton" style={{ width: 80, height: 14 }} /></td>
                    <td style={{ padding: '16px 20px' }}><div className="skeleton" style={{ width: 100, height: 22 }} /></td>
                    <td style={{ padding: '16px 20px' }}><div className="skeleton" style={{ width: 28, height: 24, borderRadius: 100 }} /></td>
                    <td style={{ padding: '16px 20px' }}><div className="skeleton" style={{ width: 56, height: 28, borderRadius: 8 }} /></td>
                  </tr>
                ))
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-mut)', fontSize: 14 }}>
                    <p style={{ marginBottom: 16 }}>No projects yet. Create one to organize your assessments.</p>
                    <button className="btn btn-primary btn-sm" onClick={() => alert('New Project dialog coming soon')}>Create First Project</button>
                  </td>
                </tr>
              ) : (
                projects.map(project => (
                  <tr key={project.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 2 }}>{project.name}</div>
                      {project.description && <div style={{ fontSize: 12, color: 'var(--text-mut)' }}>{project.description}</div>}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 14, color: 'var(--text-sec)' }}>{project.client ?? <span style={{ color: 'var(--text-mut)' }}>&mdash;</span>}</td>
                    <td style={{ padding: '16px 20px', fontSize: 14, color: 'var(--text-sec)' }}>{project.team ?? <span style={{ color: 'var(--text-mut)' }}>&mdash;</span>}</td>
                    <td style={{ padding: '16px 20px' }}>
                      {project.lever_tag ? (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, background: 'var(--cream)', color: 'var(--text-sec)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border-light)' }}>{project.lever_tag}</span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-mut)' }}>&mdash;</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className="pill pill-navy">{project.assessment_count}</span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => alert(`Edit project: ${project.name}`)}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
  )
}
