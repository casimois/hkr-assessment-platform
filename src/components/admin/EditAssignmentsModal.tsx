'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/supabase'

interface EditAssignmentsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (teams: string[], clients: string[]) => void
  user: Profile
  existingTeams: string[]
  existingClients: string[]
}

export default function EditAssignmentsModal({ isOpen, onClose, onSave, user, existingTeams, existingClients }: EditAssignmentsModalProps) {
  const [selectedTeams, setSelectedTeams] = useState<string[]>(user.assigned_teams)
  const [selectedClients, setSelectedClients] = useState<string[]>(user.assigned_clients)
  const [newTeam, setNewTeam] = useState('')
  const [newClient, setNewClient] = useState('')

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

  return (
    <div className="modal-overlay anim-fade" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, color: 'var(--navy)' }}>Edit Assignments</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-mut)', fontSize: 20 }}>&times;</button>
        </div>

        <div style={{ fontSize: 14, color: 'var(--text-sec)', marginBottom: 20 }}>
          Editing assignments for <strong style={{ color: 'var(--navy)' }}>{user.full_name || user.email}</strong>
        </div>

        <div className="form-group">
          <label className="form-label">Teams</label>
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
            {[...new Set([...existingTeams, ...selectedTeams])].length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-mut)' }}>No teams available</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" type="text" value={newTeam} onChange={e => setNewTeam(e.target.value)} placeholder="Add new team..." style={{ fontSize: 13 }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewTeam() } }}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addNewTeam} style={{ flexShrink: 0 }}>Add</button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Clients</label>
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
            {[...new Set([...existingClients, ...selectedClients])].length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-mut)' }}>No clients available</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" type="text" value={newClient} onChange={e => setNewClient(e.target.value)} placeholder="Add new client..." style={{ fontSize: 13 }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewClient() } }}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addNewClient} style={{ flexShrink: 0 }}>Add</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave(selectedTeams, selectedClients)}>Save Assignments</button>
        </div>
      </div>
    </div>
  )
}
