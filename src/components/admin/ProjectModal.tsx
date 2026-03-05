'use client'

import { useState, useEffect } from 'react'

interface ProjectData {
  id?: string
  name: string
  description: string
  client: string
  team: string
  lever_tag: string
}

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (project: ProjectData) => Promise<void>
  onDelete?: (id: string) => void
  project?: ProjectData | null
}

export default function ProjectModal({ isOpen, onClose, onSave, onDelete, project }: ProjectModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [client, setClient] = useState('')
  const [team, setTeam] = useState('')
  const [leverTag, setLeverTag] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isEdit = !!project?.id

  useEffect(() => {
    if (isOpen && project) {
      setName(project.name || '')
      setDescription(project.description || '')
      setClient(project.client || '')
      setTeam(project.team || '')
      setLeverTag(project.lever_tag || '')
    } else if (isOpen) {
      setName('')
      setDescription('')
      setClient('')
      setTeam('')
      setLeverTag('')
    }
    setError('')
    setShowDeleteConfirm(false)
  }, [isOpen, project])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Project name is required.')
      return
    }
    setError('')
    setSubmitting(true)

    try {
      await onSave({
        ...(project?.id ? { id: project.id } : {}),
        name: name.trim(),
        description: description.trim(),
        client: client.trim(),
        team: team.trim(),
        lever_tag: leverTag.trim(),
      })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setName('')
    setDescription('')
    setClient('')
    setTeam('')
    setLeverTag('')
    setError('')
    setShowDeleteConfirm(false)
    onClose()
  }

  return (
    <div className="modal-overlay anim-fade" onClick={handleClose}>
      <div className="modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, color: 'var(--navy)' }}>{isEdit ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-mut)', fontSize: 20 }}>&times;</button>
        </div>

        {showDeleteConfirm ? (
          <div>
            <div style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger)', marginBottom: 6 }}>Delete &ldquo;{project?.name}&rdquo;?</div>
              <div style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.5 }}>
                This will permanently remove the project. Assessments linked to this project will become unlinked but won&apos;t be deleted.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
                onClick={() => { if (project?.id && onDelete) { onDelete(project.id); handleClose() } }}
              >
                Delete Project
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input className="form-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer Hiring 2025" required autoFocus />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Client</label>
                <input className="form-input" type="text" value={client} onChange={e => setClient(e.target.value)} placeholder="e.g. Acme Corp" />
              </div>

              <div className="form-group">
                <label className="form-label">Team</label>
                <input className="form-input" type="text" value={team} onChange={e => setTeam(e.target.value)} placeholder="e.g. Engineering" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Lever Tag</label>
              <input className="form-input" type="text" value={leverTag} onChange={e => setLeverTag(e.target.value)} placeholder="e.g. eng-senior-2025" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }} />
              <div className="form-hint">Used to match candidates from Lever. Leave blank if not using Lever integration.</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: isEdit ? 'space-between' : 'flex-end', marginTop: 8 }}>
              {isEdit && onDelete && (
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger-light)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight: 4 }}>
                    <path d="M2 3H10M4.5 5.5V8.5M7.5 5.5V8.5M3 3L3.5 10C3.5 10.55 3.95 11 4.5 11H7.5C8.05 11 8.5 10.55 8.5 10L9 3M5 3V1.5C5 1.22 5.22 1 5.5 1H6.5C6.78 1 7 1.22 7 1.5V3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Delete
                </button>
              )}
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleClose}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
