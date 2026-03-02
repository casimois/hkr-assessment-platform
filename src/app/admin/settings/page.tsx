'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Profile, UserRole } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import AddUserModal from '@/components/admin/AddUserModal'
import EditAssignmentsModal from '@/components/admin/EditAssignmentsModal'

type Tab = 'users' | 'lever'

const ROLE_LABELS: Record<UserRole, string> = { super_admin: 'Super Admin', admin: 'Admin', user: 'User' }

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      if (data.users) setUsers(data.users)
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Collect all unique teams and clients from projects
  const [allTeams, setAllTeams] = useState<string[]>([])
  const [allClients, setAllClients] = useState<string[]>([])

  useEffect(() => {
    async function fetchProjectMeta() {
      const { data } = await supabase.from('projects').select('team, client')
      if (data) {
        setAllTeams([...new Set(data.map(p => p.team).filter(Boolean) as string[])])
        setAllClients([...new Set(data.map(p => p.client).filter(Boolean) as string[])])
      }
    }
    fetchProjectMeta()
  }, [])

  async function handleRoleChange(userId: string, newRole: UserRole) {
    const prev = users.find(u => u.id === userId)
    setUsers(us => us.map(u => u.id === userId ? { ...u, role: newRole } : u))

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        setUsers(us => us.map(u => u.id === userId ? { ...u, role: prev?.role ?? 'user' } : u))
      }
    } catch {
      setUsers(us => us.map(u => u.id === userId ? { ...u, role: prev?.role ?? 'user' } : u))
    }
  }

  async function handleToggleStatus(userId: string) {
    const user = users.find(u => u.id === userId)
    if (!user) return
    const newStatus = user.status === 'active' ? 'inactive' : 'active'

    setUsers(us => us.map(u => u.id === userId ? { ...u, status: newStatus } : u))
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        setUsers(us => us.map(u => u.id === userId ? { ...u, status: user.status } : u))
      }
    } catch {
      setUsers(us => us.map(u => u.id === userId ? { ...u, status: user.status } : u))
    }
  }

  async function handleSaveAssignments(teams: string[], clients: string[]) {
    if (!editUser) return
    const userId = editUser.id

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_teams: teams, assigned_clients: clients }),
      })
      if (res.ok) {
        setUsers(us => us.map(u => u.id === userId ? { ...u, assigned_teams: teams, assigned_clients: clients } : u))
      }
    } catch { /* revert handled by re-fetch */ }

    setEditUser(null)
  }

  function getInitials(user: Profile) {
    const name = user.full_name || user.email
    return name.split(/[\s.@]+/).map(w => w[0]?.toUpperCase()).join('').slice(0, 2)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function statusPill(status: string) {
    if (status === 'active') return <span className="pill pill-success">Active</span>
    if (status === 'pending') return <span className="pill pill-accent">Pending</span>
    return <span className="pill pill-navy">Inactive</span>
  }

  return (
    <div className="anim-up">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, color: 'var(--navy)', marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 14, color: 'var(--text-mut)' }}>Manage users, roles, and integrations</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users &amp; Roles</button>
        <button className={`tab ${activeTab === 'lever' ? 'active' : ''}`} onClick={() => setActiveTab('lever')}>Lever Integration</button>
      </div>

      {/* ---- Users & Roles tab ---- */}
      {activeTab === 'users' && (
        <div>
          {/* Role explanation */}
          <div style={{ display: 'flex', gap: 12, background: 'var(--cream)', border: '1px solid var(--border-light)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 1, color: 'var(--text-mut)' }}>
              <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 9V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="10" cy="6.5" r="0.75" fill="currentColor" />
            </svg>
            <div style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--navy)' }}>Super Admin</strong> &mdash; Full platform access including settings and user management.<br />
              <strong style={{ color: 'var(--navy)' }}>Admin</strong> &mdash; Full access to assessments, results, and candidates. No settings access.<br />
              <strong style={{ color: 'var(--navy)' }}>User</strong> &mdash; View-only access to assigned projects and their results.
            </div>
          </div>

          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, color: 'var(--navy)' }}>Team Members</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setAddModalOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              Add User
            </button>
          </div>

          {/* Users table */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: 800 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    {["User", "Role", "Status", "Last Login", "Assignments", ""].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '14px 20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-mut)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '14px 20px' }}><div className="skeleton" style={{ width: 160, height: 14 }} /></td>
                        <td style={{ padding: '14px 20px' }}><div className="skeleton" style={{ width: 100, height: 30 }} /></td>
                        <td style={{ padding: '14px 20px' }}><div className="skeleton" style={{ width: 60, height: 22 }} /></td>
                        <td style={{ padding: '14px 20px' }}><div className="skeleton" style={{ width: 80, height: 14 }} /></td>
                        <td style={{ padding: '14px 20px' }}><div className="skeleton" style={{ width: 120, height: 14 }} /></td>
                        <td style={{ padding: '14px 20px' }}><div className="skeleton" style={{ width: 80, height: 28 }} /></td>
                      </tr>
                    ))
                  ) : users.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{getInitials(user)}</div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 1 }}>{user.full_name || 'Pending Setup'}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-mut)' }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <select className="form-select" style={{ width: 'auto', padding: '6px 30px 6px 12px', fontSize: 13, fontWeight: 500, borderRadius: 8 }} value={user.role} onChange={e => handleRoleChange(user.id, e.target.value as UserRole)}>
                          <option value="super_admin">Super Admin</option>
                          <option value="admin">Admin</option>
                          <option value="user">User</option>
                        </select>
                      </td>
                      <td style={{ padding: '14px 20px' }}>{statusPill(user.status)}</td>
                      <td style={{ padding: '14px 20px', fontSize: 14, color: 'var(--text-sec)' }}>{formatDate(user.last_login)}</td>
                      <td style={{ padding: '14px 20px' }}>
                        {user.role === 'user' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {user.assigned_teams.length > 0 && (
                              <div style={{ fontSize: 12, color: 'var(--text-sec)' }}>
                                Teams: {user.assigned_teams.join(', ')}
                              </div>
                            )}
                            {user.assigned_clients.length > 0 && (
                              <div style={{ fontSize: 12, color: 'var(--text-sec)' }}>
                                Clients: {user.assigned_clients.join(', ')}
                              </div>
                            )}
                            {user.assigned_teams.length === 0 && user.assigned_clients.length === 0 && (
                              <span style={{ fontSize: 12, color: 'var(--text-mut)' }}>No assignments</span>
                            )}
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '4px 8px', width: 'fit-content' }} onClick={() => setEditUser(user)}>
                              Edit
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-mut)' }}>Full access</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {user.status !== 'pending' && (
                          <button
                            className="btn btn-sm"
                            style={{
                              background: 'transparent',
                              color: user.status === 'active' ? 'var(--danger)' : 'var(--success)',
                              border: `1px solid ${user.status === 'active' ? 'var(--danger-light)' : 'var(--success-light)'}`,
                              borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer',
                            }}
                            onClick={() => handleToggleStatus(user.id)}
                          >
                            {user.status === 'active' ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---- Lever Integration tab ---- */}
      {activeTab === 'lever' && (
        <div>
          <div style={{ display: 'flex', gap: 12, background: 'var(--cream)', border: '1px solid var(--border-light)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 1, color: 'var(--text-mut)' }}>
              <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 9V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="10" cy="6.5" r="0.75" fill="currentColor" />
            </svg>
            <div style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.6 }}>
              Lever integration is coming soon. This section will allow you to configure API keys, webhook endpoints, and stage-to-assessment mappings.
            </div>
          </div>

          {/* Webhook URL */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--text-mut)', marginBottom: 8 }}>Webhook URL</div>
            <input className="form-input" type="text" readOnly value="https://app.hkr.team/api/lever/webhook" onClick={e => (e.target as HTMLInputElement).select()} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--text-sec)', background: 'var(--cream)' }} />
          </div>
        </div>
      )}

      {/* Modals */}
      <AddUserModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={fetchUsers}
        existingTeams={allTeams}
        existingClients={allClients}
      />

      {editUser && (
        <EditAssignmentsModal
          isOpen={!!editUser}
          onClose={() => setEditUser(null)}
          onSave={handleSaveAssignments}
          user={editUser}
          existingTeams={allTeams}
          existingClients={allClients}
        />
      )}
    </div>
  )
}
