'use client'

import { useState } from 'react'

type Tab = 'users' | 'lever'
type Role = 'super_admin' | 'admin' | 'user'

interface UserRow {
  id: string; initials: string; avatarBg: string; name: string; email: string;
  role: Role; status: 'active' | 'inactive'; lastLogin: string; permissions: string;
}

interface SyncEvent { id: string; timestamp: string; direction: 'outbound' | 'inbound'; event: string; status: 'success' | 'failed'; }
interface StageMapping { stage: string; assessment: string; project: string; }

const USERS: UserRow[] = [
  { id: '1', initials: 'SA', avatarBg: 'var(--navy)', name: 'Sarah Anderson', email: 'sarah@hkr.team', role: 'super_admin', status: 'active', lastLogin: 'Feb 27, 2026', permissions: 'Full access' },
  { id: '2', initials: 'MR', avatarBg: 'var(--purple)', name: 'Mark Rivera', email: 'mark@hkr.team', role: 'admin', status: 'active', lastLogin: 'Feb 26, 2026', permissions: 'Full access' },
  { id: '3', initials: 'EL', avatarBg: 'var(--accent)', name: 'Elena Lupescu', email: 'elena@hkr.team', role: 'user', status: 'active', lastLogin: 'Feb 25, 2026', permissions: '1 project(s)' },
]
const STAGE_MAPPINGS: StageMapping[] = [
  { stage: 'Assessment Stage', assessment: 'English Proficiency Assessment', project: 'Client Onboarding' },
  { stage: 'Assessment Stage', assessment: 'Project Manager', project: 'Client Onboarding' },
]
const SYNC_EVENTS: SyncEvent[] = [
  { id: '1', timestamp: 'Feb 27, 2026 2:14 PM', direction: 'outbound', event: 'Score pushed for Maria Santos', status: 'success' },
  { id: '2', timestamp: 'Feb 27, 2026 11:30 AM', direction: 'inbound', event: 'Candidate synced: James Chen', status: 'success' },
  { id: '3', timestamp: 'Feb 26, 2026 4:45 PM', direction: 'outbound', event: 'Assessment link sent to Tom Wilson', status: 'success' },
  { id: '4', timestamp: 'Feb 26, 2026 9:02 AM', direction: 'inbound', event: 'Webhook received: stage change', status: 'failed' },
]
const ROLE_LABELS: Record<Role, string> = { super_admin: 'Super Admin', admin: 'Admin', user: 'User' }

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [users, setUsers] = useState<UserRow[]>(USERS)

  function handleRoleChange(userId: string, newRole: Role) {
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role: newRole } : u)))
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
            <button className="btn btn-primary btn-sm" onClick={() => alert('Add User dialog coming soon')}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              Add User
            </button>
          </div>

          {/* Users table */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: 700 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    {["User", "Role", "Status", "Last Login", "Permissions", ""].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '14px 20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-mut)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: user.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{user.initials}</div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 1 }}>{user.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-mut)' }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <select className="form-select" style={{ width: 'auto', padding: '6px 30px 6px 12px', fontSize: 13, fontWeight: 500, borderRadius: 8 }} value={user.role} onChange={e => handleRoleChange(user.id, e.target.value as Role)}>
                          <option value="super_admin">Super Admin</option>
                          <option value="admin">Admin</option>
                          <option value="user">User</option>
                        </select>
                      </td>
                      <td style={{ padding: '14px 20px' }}><span className="pill pill-success">Active</span></td>
                      <td style={{ padding: '14px 20px', fontSize: 14, color: 'var(--text-sec)' }}>{user.lastLogin}</td>
                      <td style={{ padding: '14px 20px', fontSize: 14, color: 'var(--text-sec)' }}>{user.permissions}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <button className="btn btn-sm" style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger-light)', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }} onClick={() => alert(`Deactivate user: ${user.name}`)}>Deactivate</button>
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
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {[{ label: 'API Key', value: 'Configured' }, { label: 'Webhook Secret', value: 'Configured' }].map(s => (
              <div key={s.label} className="card card-pad" style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-mut)', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" /><path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Webhook URL */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--text-mut)', marginBottom: 8 }}>Webhook URL</div>
            <input className="form-input" type="text" readOnly value="https://app.hkr.team/api/lever/webhook" onClick={e => (e.target as HTMLInputElement).select()} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--text-sec)', background: 'var(--cream)' }} />
          </div>

          {/* Stage Mappings */}
          <h3 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 16 }}>Stage → Assessment Mappings</h3>
          <div className="card" style={{ padding: 0, marginBottom: 28 }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    {["Lever Stage", "Assessment", "Project"].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '14px 20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-mut)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {STAGE_MAPPINGS.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '14px 20px', fontSize: 14, color: 'var(--text-sec)' }}>{m.stage}</td>
                      <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{m.assessment}</td>
                      <td style={{ padding: '14px 20px', fontSize: 14, color: 'var(--text-sec)' }}>{m.project}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Sync Events */}
          <h3 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 16 }}>Recent Sync Events</h3>
          <div className="card" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    {["Timestamp", "Direction", "Event", "Status"].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '14px 20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-mut)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SYNC_EVENTS.map(evt => (
                    <tr key={evt.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-mut)' }}>{evt.timestamp}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span className={`pill ${evt.direction === 'outbound' ? 'pill-blue' : 'pill-accent'}`} style={{ textTransform: 'capitalize' }}>{evt.direction}</span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 14, color: 'var(--text-sec)' }}>{evt.event}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span className={`pill ${evt.status === 'success' ? 'pill-success' : 'pill-danger'}`} style={{ textTransform: 'capitalize' }}>{evt.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
