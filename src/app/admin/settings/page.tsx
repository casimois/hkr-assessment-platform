'use client'

import { useState } from 'react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Tab = 'users' | 'lever'
type Role = 'super_admin' | 'admin' | 'user'

interface UserRow {
  id: string
  initials: string
  avatarBg: string
  name: string
  email: string
  role: Role
  status: 'active' | 'inactive'
  lastLogin: string
  permissions: string
}

interface SyncEvent {
  id: string
  timestamp: string
  direction: 'outbound' | 'inbound'
  event: string
  status: 'success' | 'failed'
}

interface StageMapping {
  stage: string
  assessment: string
  project: string
}

/* ------------------------------------------------------------------ */
/*  Hardcoded data                                                     */
/* ------------------------------------------------------------------ */

const USERS: UserRow[] = [
  {
    id: '1',
    initials: 'SA',
    avatarBg: 'var(--navy)',
    name: 'Sarah Anderson',
    email: 'sarah@hkr.team',
    role: 'super_admin',
    status: 'active',
    lastLogin: 'Feb 27, 2026',
    permissions: 'Full access',
  },
  {
    id: '2',
    initials: 'MR',
    avatarBg: 'var(--purple)',
    name: 'Mark Rivera',
    email: 'mark@hkr.team',
    role: 'admin',
    status: 'active',
    lastLogin: 'Feb 26, 2026',
    permissions: 'Full access',
  },
  {
    id: '3',
    initials: 'EL',
    avatarBg: 'var(--accent)',
    name: 'Elena Lupescu',
    email: 'elena@hkr.team',
    role: 'user',
    status: 'active',
    lastLogin: 'Feb 25, 2026',
    permissions: '1 project(s)',
  },
]

const STAGE_MAPPINGS: StageMapping[] = [
  { stage: 'Assessment Stage', assessment: 'English Proficiency Assessment', project: 'Client Onboarding' },
  { stage: 'Assessment Stage', assessment: 'Project Manager', project: 'Client Onboarding' },
]

const SYNC_EVENTS: SyncEvent[] = [
  {
    id: '1',
    timestamp: 'Feb 27, 2026 2:14 PM',
    direction: 'outbound',
    event: 'Score pushed for Maria Santos',
    status: 'success',
  },
  {
    id: '2',
    timestamp: 'Feb 27, 2026 11:30 AM',
    direction: 'inbound',
    event: 'Candidate synced: James Chen',
    status: 'success',
  },
  {
    id: '3',
    timestamp: 'Feb 26, 2026 4:45 PM',
    direction: 'outbound',
    event: 'Assessment link sent to Tom Wilson',
    status: 'success',
  },
  {
    id: '4',
    timestamp: 'Feb 26, 2026 9:02 AM',
    direction: 'inbound',
    event: 'Webhook received: stage change',
    status: 'failed',
  },
]

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  user: 'User',
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [users, setUsers] = useState<UserRow[]>(USERS)

  function handleRoleChange(userId: string, newRole: Role) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    )
  }

  return (
    <>
      <style jsx>{`
        .settings-page {
          max-width: 1320px;
          margin: 0 auto;
        }

        /* Header */
        .page-header {
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

        /* Tabs */
        .tabs {
          display: flex;
          gap: 0;
          border-bottom: 1px solid var(--border-light);
          margin-bottom: 28px;
        }
        .tab {
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-mut);
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
          margin-bottom: -1px;
        }
        .tab:hover {
          color: var(--text-sec);
        }
        .tab.active {
          color: var(--navy);
          font-weight: 600;
          border-bottom-color: var(--navy);
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

        /* Info box */
        .info-box {
          display: flex;
          gap: 12px;
          background: var(--cream);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 24px;
        }
        .info-icon {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          color: var(--text-mut);
          margin-top: 1px;
        }
        .info-text {
          font-size: 13px;
          color: var(--text-sec);
          line-height: 1.6;
        }
        .info-text strong {
          color: var(--navy);
          font-weight: 600;
        }

        /* Section header with action */
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .section-title {
          font-family: 'DM Serif Display', serif;
          font-weight: 400;
          font-size: 18px;
          color: var(--navy);
        }

        /* Card */
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
          min-width: 700px;
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
          padding: 14px 20px;
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

        /* Avatar in table */
        .user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: #fff;
          flex-shrink: 0;
        }
        .user-name {
          font-weight: 600;
          color: var(--navy);
          margin-bottom: 1px;
        }
        .user-email {
          font-size: 12px;
          color: var(--text-mut);
        }

        /* Role select */
        .role-select {
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid var(--border-light);
          border-radius: 8px;
          background: var(--white);
          color: var(--text-sec);
          cursor: pointer;
          outline: none;
          transition: border-color 0.15s;
          appearance: auto;
        }
        .role-select:hover {
          border-color: var(--border);
        }
        .role-select:focus {
          border-color: var(--navy);
        }

        /* Status pill */
        .pill-active {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 100px;
          background: var(--success-light);
          color: var(--success);
          white-space: nowrap;
        }

        /* Deactivate button */
        .btn-deactivate {
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 500;
          background: transparent;
          color: var(--danger);
          border: 1px solid var(--danger-light);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-deactivate:hover {
          background: var(--danger-light);
          border-color: var(--danger);
        }

        /* ---- Lever tab ---- */

        /* Stat cards row */
        .stat-cards-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: var(--white);
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 20px 24px;
        }
        .stat-card-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--text-mut);
          margin-bottom: 8px;
        }
        .stat-card-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--success);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Webhook URL field */
        .webhook-field {
          margin-bottom: 28px;
        }
        .webhook-label {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: var(--text-mut);
          margin-bottom: 8px;
        }
        .webhook-input {
          width: 100%;
          padding: 12px 16px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: var(--text-sec);
          background: var(--cream);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          outline: none;
        }

        /* Direction pills */
        .pill-outbound,
        .pill-inbound {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 100px;
          white-space: nowrap;
        }
        .pill-outbound {
          background: var(--blue-light);
          color: var(--blue);
        }
        .pill-inbound {
          background: var(--accent-light);
          color: var(--accent);
        }

        /* Status pills for sync events */
        .pill-success {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 100px;
          background: var(--success-light);
          color: var(--success);
          white-space: nowrap;
        }
        .pill-failed {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 100px;
          background: var(--danger-light);
          color: var(--danger);
          white-space: nowrap;
        }

        /* Spacing helper */
        .mb-28 {
          margin-bottom: 28px;
        }
      `}</style>

      <div className="settings-page anim-up">
        {/* Header */}
        <div className="page-header">
          <h1>Settings</h1>
          <p>Manage users, roles, and integrations</p>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users &amp; Roles
          </button>
          <button
            className={`tab ${activeTab === 'lever' ? 'active' : ''}`}
            onClick={() => setActiveTab('lever')}
          >
            Lever Integration
          </button>
        </div>

        {/* ============================================================ */}
        {/*  Users & Roles tab                                           */}
        {/* ============================================================ */}
        {activeTab === 'users' && (
          <div>
            {/* Role explanation */}
            <div className="info-box">
              <svg className="info-icon" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 9V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="10" cy="6.5" r="0.75" fill="currentColor" />
              </svg>
              <div className="info-text">
                <strong>Super Admin</strong> &mdash; Full platform access including settings and user management.
                <br />
                <strong>Admin</strong> &mdash; Full access to assessments, results, and candidates. No settings access.
                <br />
                <strong>User</strong> &mdash; View-only access to assigned projects and their results.
              </div>
            </div>

            {/* Section header */}
            <div className="section-header">
              <div className="section-title">Team Members</div>
              <button
                className="btn-primary"
                onClick={() => alert('Add User dialog coming soon')}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Add User
              </button>
            </div>

            {/* Users table */}
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Permissions</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="user-cell">
                            <div
                              className="avatar"
                              style={{ background: user.avatarBg }}
                            >
                              {user.initials}
                            </div>
                            <div>
                              <div className="user-name">{user.name}</div>
                              <div className="user-email">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <select
                            className="role-select"
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(user.id, e.target.value as Role)
                            }
                          >
                            <option value="super_admin">Super Admin</option>
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
                          </select>
                        </td>
                        <td>
                          <span className="pill-active">
                            {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                          </span>
                        </td>
                        <td>{user.lastLogin}</td>
                        <td>{user.permissions}</td>
                        <td>
                          <button
                            className="btn-deactivate"
                            onClick={() =>
                              alert(`Deactivate user: ${user.name}`)
                            }
                          >
                            Deactivate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/*  Lever Integration tab                                       */}
        {/* ============================================================ */}
        {activeTab === 'lever' && (
          <div>
            {/* Stat cards */}
            <div className="stat-cards-row">
              <div className="stat-card">
                <div className="stat-card-label">API Key</div>
                <div className="stat-card-value">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Configured
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Webhook Secret</div>
                <div className="stat-card-value">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Configured
                </div>
              </div>
            </div>

            {/* Webhook URL */}
            <div className="webhook-field">
              <div className="webhook-label">Webhook URL</div>
              <input
                className="webhook-input"
                type="text"
                readOnly
                value="https://app.hkr.team/api/lever/webhook"
                onClick={(e) => {
                  const target = e.target as HTMLInputElement
                  target.select()
                }}
              />
            </div>

            {/* Stage Mappings */}
            <div className="section-header mb-28">
              <div className="section-title">Stage &rarr; Assessment Mappings</div>
            </div>
            <div className="card" style={{ marginBottom: 28 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Lever Stage</th>
                      <th>Assessment</th>
                      <th>Project</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STAGE_MAPPINGS.map((m, i) => (
                      <tr key={i}>
                        <td>{m.stage}</td>
                        <td style={{ fontWeight: 600, color: 'var(--navy)' }}>
                          {m.assessment}
                        </td>
                        <td>{m.project}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Sync Events */}
            <div className="section-header mb-28">
              <div className="section-title">Recent Sync Events</div>
            </div>
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Direction</th>
                      <th>Event</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SYNC_EVENTS.map((evt) => (
                      <tr key={evt.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-mut)' }}>
                          {evt.timestamp}
                        </td>
                        <td>
                          <span
                            className={
                              evt.direction === 'outbound'
                                ? 'pill-outbound'
                                : 'pill-inbound'
                            }
                          >
                            {evt.direction.charAt(0).toUpperCase() + evt.direction.slice(1)}
                          </span>
                        </td>
                        <td>{evt.event}</td>
                        <td>
                          <span
                            className={
                              evt.status === 'success'
                                ? 'pill-success'
                                : 'pill-failed'
                            }
                          >
                            {evt.status.charAt(0).toUpperCase() + evt.status.slice(1)}
                          </span>
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
    </>
  )
}
