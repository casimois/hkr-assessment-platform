'use client'

import { useState } from 'react'
import type { UserRole } from '@/lib/supabase'

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  existingTeams: string[]
  existingClients: string[]
}

export default function AddUserModal({ isOpen, onClose, onSuccess, existingTeams, existingClients }: AddUserModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('user')
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [newTeam, setNewTeam] = useState('')
  const [newClient, setNewClient] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [activationUrl, setActivationUrl] = useState('')

  if (!isOpen) return null

  function toggleTeam(team: string) {
    setSelectedTeams(prev => prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team])
  }

  function toggleClient(client: string) {
    setSelectedClients(prev => prev.includes(client) ? prev.filter(c => c !== client) : [...prev, client])
  }

  function addNewTeam() {
    const t = newTeam.trim()
    if (t && !selectedTeams.includes(t)) {
      setSelectedTeams(prev => [...prev, t])
      setNewTeam('')
    }
  }

  function addNewClient() {
    const c = newClient.trim()
    if (c && !selectedClients.includes(c)) {
      setSelectedClients(prev => [...prev, c])
      setNewClient('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setActivationUrl('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role,
          assigned_teams: role === 'user' ? selectedTeams : [],
          assigned_clients: role === 'user' ? selectedClients : [],
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to invite user')
        setSubmitting(false)
        return
      }

      if (data.activationUrl) {
        setActivationUrl(data.activationUrl)
      }

      if (data.emailSent) {
        onSuccess()
        handleClose()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setEmail('')
    setRole('user')
    setSelectedTeams([])
    setSelectedClients([])
    setNewTeam('')
    setNewClient('')
    setError('')
    setActivationUrl('')
    onClose()
  }

  return (
    <div className="modal-overlay anim-fade" onClick={handleClose}>
      <div className="modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, color: 'var(--navy)' }}>Invite User</h2>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-mut)', fontSize: 20 }}>&times;</button>
        </div>

        {activationUrl ? (
          <div>
            <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>Email delivery may be limited</div>
              <div style={{ fontSize: 12, color: 'var(--text-sec)', lineHeight: 1.5 }}>Copy this activation link and send it to the user manually:</div>
            </div>
            <input
              className="form-input"
              type="text"
              readOnly
              value={activationUrl}
              onClick={e => (e.target as HTMLInputElement).select()}
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(activationUrl) }}>Copy Link</button>
              <button className="btn btn-primary btn-sm" onClick={() => { onSuccess(); handleClose() }}>Done</button>
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
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@company.com" required />
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <div className="form-hint">
                {role === 'super_admin' && 'Full platform access including settings and user management.'}
                {role === 'admin' && 'Full access to assessments, results, and candidates. No settings.'}
                {role === 'user' && 'View-only access scoped to assigned teams and clients.'}
              </div>
            </div>

            {role === 'user' && (
              <>
                <div className="form-group">
                  <label className="form-label">Assigned Teams</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {[...new Set([...existingTeams, ...selectedTeams])].map(team => (
                      <button type="button" key={team} onClick={() => toggleTeam(team)}
                        style={{
                          padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                          background: selectedTeams.includes(team) ? 'var(--navy)' : 'var(--white)',
                          color: selectedTeams.includes(team) ? '#fff' : 'var(--text-sec)',
                          borderColor: selectedTeams.includes(team) ? 'var(--navy)' : 'var(--border-light)',
                          transition: 'all .15s',
                        }}
                      >
                        {team}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-input" type="text" value={newTeam} onChange={e => setNewTeam(e.target.value)} placeholder="Add new team..." style={{ fontSize: 13 }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewTeam() } }}
                    />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addNewTeam} style={{ flexShrink: 0 }}>Add</button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Clients</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {[...new Set([...existingClients, ...selectedClients])].map(client => (
                      <button type="button" key={client} onClick={() => toggleClient(client)}
                        style={{
                          padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                          background: selectedClients.includes(client) ? 'var(--navy)' : 'var(--white)',
                          color: selectedClients.includes(client) ? '#fff' : 'var(--text-sec)',
                          borderColor: selectedClients.includes(client) ? 'var(--navy)' : 'var(--border-light)',
                          transition: 'all .15s',
                        }}
                      >
                        {client}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-input" type="text" value={newClient} onChange={e => setNewClient(e.target.value)} placeholder="Add new client..." style={{ fontSize: 13 }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewClient() } }}
                    />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addNewClient} style={{ flexShrink: 0 }}>Add</button>
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleClose}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting ? 'Sending Invite...' : 'Send Invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
