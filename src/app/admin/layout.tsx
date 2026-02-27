'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/* ------------------------------------------------------------------ */
/*  SVG icon components for sidebar nav                                */
/* ------------------------------------------------------------------ */

const icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="1" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="10.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  assessments: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.5 1.5H4.5C3.67 1.5 3 2.17 3 3V15C3 15.83 3.67 16.5 4.5 16.5H13.5C14.33 16.5 15 15.83 15 15V6L10.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 1.5V6H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.75 9.75H11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.75 12.75H9.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  results: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.5 9H4.5L6.75 3L9.75 15L12 7.5H13.5L16.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  candidates: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="5.25" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 15.75C3 12.85 5.69 10.5 9 10.5C12.31 10.5 15 12.85 15 15.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  projects: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.5 14.25C16.5 14.65 16.34 15.03 16.06 15.31C15.78 15.59 15.4 15.75 15 15.75H3C2.6 15.75 2.22 15.59 1.94 15.31C1.66 15.03 1.5 14.65 1.5 14.25V3.75C1.5 3.35 1.66 2.97 1.94 2.69C2.22 2.41 2.6 2.25 3 2.25H6.75L8.25 4.5H15C15.4 4.5 15.78 4.66 16.06 4.94C16.34 5.22 16.5 5.6 16.5 6V14.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14.7 11.1C14.61 11.3 14.58 11.52 14.63 11.73C14.68 11.94 14.8 12.13 14.97 12.27L15.03 12.33C15.17 12.47 15.28 12.63 15.35 12.81C15.42 12.99 15.46 13.19 15.46 13.39C15.46 13.59 15.42 13.78 15.35 13.97C15.28 14.15 15.17 14.31 15.03 14.45C14.89 14.59 14.73 14.7 14.55 14.77C14.37 14.84 14.18 14.88 13.98 14.88C13.78 14.88 13.58 14.84 13.4 14.77C13.22 14.7 13.06 14.59 12.92 14.45L12.86 14.39C12.72 14.22 12.53 14.1 12.32 14.05C12.11 14 11.89 14.03 11.69 14.12C11.5 14.2 11.34 14.34 11.23 14.51C11.12 14.68 11.06 14.89 11.06 15.1V15.3C11.06 15.71 10.89 16.1 10.6 16.39C10.31 16.68 9.92 16.85 9.51 16.85C9.1 16.85 8.71 16.68 8.42 16.39C8.13 16.1 7.96 15.71 7.96 15.3V15.19C7.95 14.97 7.88 14.76 7.75 14.59C7.63 14.42 7.45 14.29 7.25 14.22C7.05 14.13 6.83 14.1 6.62 14.15C6.41 14.2 6.22 14.32 6.08 14.49L6.02 14.55C5.88 14.69 5.72 14.8 5.54 14.87C5.36 14.94 5.16 14.98 4.96 14.98C4.76 14.98 4.57 14.94 4.39 14.87C4.21 14.8 4.05 14.69 3.91 14.55C3.77 14.41 3.66 14.25 3.59 14.07C3.52 13.89 3.48 13.7 3.48 13.5C3.48 13.3 3.52 13.1 3.59 12.92C3.66 12.74 3.77 12.58 3.91 12.44L3.97 12.38C4.14 12.24 4.26 12.05 4.31 11.84C4.36 11.63 4.33 11.41 4.24 11.21C4.16 11.02 4.02 10.86 3.85 10.75C3.68 10.64 3.47 10.58 3.26 10.58H3.06C2.65 10.58 2.26 10.41 1.97 10.12C1.68 9.83 1.51 9.44 1.51 9.03C1.51 8.62 1.68 8.23 1.97 7.94C2.26 7.65 2.65 7.48 3.06 7.48H3.17C3.39 7.47 3.6 7.4 3.77 7.27C3.94 7.15 4.07 6.97 4.14 6.77C4.23 6.57 4.26 6.35 4.21 6.14C4.16 5.93 4.04 5.74 3.87 5.6L3.81 5.54C3.67 5.4 3.56 5.24 3.49 5.06C3.42 4.88 3.38 4.69 3.38 4.49C3.38 4.29 3.42 4.09 3.49 3.91C3.56 3.73 3.67 3.57 3.81 3.43C3.95 3.29 4.11 3.18 4.29 3.11C4.47 3.04 4.66 3 4.86 3C5.06 3 5.26 3.04 5.44 3.11C5.62 3.18 5.78 3.29 5.92 3.43L5.98 3.49C6.12 3.66 6.31 3.78 6.52 3.83C6.73 3.88 6.95 3.85 7.15 3.76H7.25C7.44 3.68 7.6 3.54 7.71 3.37C7.82 3.2 7.88 2.99 7.88 2.78V2.58C7.88 2.17 8.05 1.78 8.34 1.49C8.63 1.2 9.02 1.03 9.43 1.03C9.84 1.03 10.23 1.2 10.52 1.49C10.81 1.78 10.98 2.17 10.98 2.58V2.69C10.98 2.9 11.04 3.11 11.15 3.28C11.26 3.45 11.42 3.59 11.61 3.67C11.81 3.76 12.03 3.79 12.24 3.74C12.45 3.69 12.64 3.57 12.78 3.4L12.84 3.34C12.98 3.2 13.14 3.09 13.32 3.02C13.5 2.95 13.7 2.91 13.9 2.91C14.1 2.91 14.29 2.95 14.47 3.02C14.65 3.09 14.81 3.2 14.95 3.34C15.09 3.48 15.2 3.64 15.27 3.82C15.34 4 15.38 4.2 15.38 4.4C15.38 4.6 15.34 4.79 15.27 4.97C15.2 5.15 15.09 5.31 14.95 5.45L14.89 5.51C14.72 5.65 14.6 5.84 14.55 6.05C14.5 6.26 14.53 6.48 14.62 6.68V6.78C14.7 6.97 14.84 7.13 15.01 7.24C15.18 7.35 15.39 7.41 15.6 7.41H15.8C16.21 7.41 16.6 7.58 16.89 7.87C17.18 8.16 17.35 8.55 17.35 8.96C17.35 9.37 17.18 9.76 16.89 10.05C16.6 10.34 16.21 10.51 15.8 10.51H15.69C15.48 10.51 15.27 10.57 15.1 10.68C14.93 10.79 14.79 10.95 14.7 11.14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  exit: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.75 15.75H3.75C3.35 15.75 2.97 15.59 2.69 15.31C2.41 15.03 2.25 14.65 2.25 14.25V3.75C2.25 3.35 2.41 2.97 2.69 2.69C2.97 2.41 3.35 2.25 3.75 2.25H6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 12.75L15.75 9L12 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.75 9H6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/*  Nav data                                                           */
/* ------------------------------------------------------------------ */

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: icons.dashboard },
    ],
  },
  {
    title: 'Assessments',
    items: [
      { label: 'Assessments', href: '/admin/assessments', icon: icons.assessments },
      { label: 'Results', href: '/admin/results', icon: icons.results },
      { label: 'Candidates', href: '/admin/candidates', icon: icons.candidates },
    ],
  },
  {
    title: 'Organization',
    items: [
      { label: 'Projects', href: '/admin/projects', icon: icons.projects },
      { label: 'Settings', href: '/admin/settings', icon: icons.settings },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Page title mapping                                                 */
/* ------------------------------------------------------------------ */

const pageTitles: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/assessments': 'Assessments',
  '/admin/results': 'Results',
  '/admin/candidates': 'Candidates',
  '/admin/projects': 'Projects',
  '/admin/settings': 'Settings',
};

/* ------------------------------------------------------------------ */
/*  Layout component                                                   */
/* ------------------------------------------------------------------ */

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const currentTitle = pageTitles[pathname] ?? 'Admin';

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      {/* ---- Sidebar ---- */}
      <aside
        style={{
          width: 240,
          minWidth: 240,
          height: '100vh',
          background: 'var(--navy)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px' }}>
          <img
            src="https://hkr.team/hubfs/Navy(spread)_vector.svg"
            alt="HKR Logo"
            style={{ height: 24, filter: 'brightness(0) invert(1)' }}
          />
        </div>

        {/* Nav sections */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {navSections.map((section) => (
            <div key={section.title} style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'rgba(255,255,255,0.35)',
                  padding: '0 8px 8px',
                }}
              >
                {section.title}
              </div>

              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 12px',
                      borderRadius: 8,
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                      background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                      marginBottom: 2,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '16px 16px',
          }}
        >
          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                color: '#FFFFFF',
                flexShrink: 0,
              }}
            >
              SA
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Sarah Anderson
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                Super Admin
              </div>
            </div>
          </div>

          {/* Exit admin link */}
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.45)',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>{icons.exit}</span>
            Exit Admin
          </Link>
        </div>
      </aside>

      {/* ---- Main area ---- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header
          style={{
            height: 64,
            minHeight: 64,
            background: 'var(--white)',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
          }}
        >
          <h2
            style={{
              fontSize: 20,
              fontWeight: 400,
              color: 'var(--text)',
              fontFamily: "'DM Serif Display', serif",
            }}
          >
            {currentTitle}
          </h2>

          {/* Action buttons slot -- pages can portal here or use a context */}
          <div id="admin-topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }} />
        </header>

        {/* Content area */}
        <main
          style={{
            flex: 1,
            overflow: 'auto',
            background: 'var(--offwhite)',
            padding: 32,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
