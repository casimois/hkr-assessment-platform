'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { hasMinRole } from '@/lib/access'
import ProjectModal from '@/components/admin/ProjectModal'

interface ProjectRow {
  id: string
  name: string
  description: string | null
  client: string | null
  team: string | null
  lever_tag: string | null
  assessment_count: number
}

interface ProjectData {
  id?: string
  name: string
  description: string
  client: string
  team: string
  lever_tag: string
}

export default function ProjectsPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null)

  // Redirect 'user' role
  useEffect(() => {
    if (profile && !hasMinRole(profile.role, 'admin')) {
      router.push('/admin/dashboard')
    }
  }, [profile, router])

  const fetchProjects = useCallback(async () => {
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
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  function openCreate() {
    setEditingProject(null)
    setModalOpen(true)
  }

  function openEdit(project: ProjectRow) {
    setEditingProject({
      id: project.id,
      name: project.name,
      description: project.description || '',
      client: project.client || '',
      team: project.team || '',
      lever_tag: project.lever_tag || '',
    })
    setModalOpen(true)
  }

  async function handleSave(project: ProjectData) {
    if (project.id) {
      // Update
      const { error } = await supabase
        .from('projects')
        .update({
          name: project.name,
          description: project.description || null,
          client: project.client || null,
          team: project.team || null,
          lever_tag: project.lever_tag || null,
        })
        .eq('id', project.id)

      if (error) throw new Error(error.message)
    } else {
      // Create
      const { error } = await supabase
        .from('projects')
        .insert({
          name: project.name,
          description: project.description || null,
          client: project.client || null,
          team: project.team || null,
          lever_tag: project.lever_tag || null,
        })

      if (error) throw new Error(error.message)
    }

    await fetchProjects()
  }

  async function handleDelete(id: string) {
    // Unlink assessments first, then delete project
    await supabase.from('assessments').update({ project_id: null }).eq('project_id', id)
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) {
      console.error('Delete project error:', error)
    }
    await fetchProjects()
  }

  return (
    <div className="anim-up">
      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <button className="btn btn-primary" onClick={openCreate}>
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
                    <button className="btn btn-primary btn-sm" onClick={openCreate}>Create First Project</button>
                  </td>
                </tr>
              ) : (
                projects.map(project => (
                  <tr key={project.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => openEdit(project)}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{project.name}</div>
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
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={e => { e.stopPropagation(); openEdit(project) }}>
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

      {/* Modal */}
      <ProjectModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProject(null) }}
        onSave={handleSave}
        onDelete={handleDelete}
        project={editingProject}
      />
    </div>
  )
}
