'use client'

import { Component, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div style={{
          minHeight: '50vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}>
          <div style={{
            background: 'var(--white)',
            border: '1px solid var(--border-light)',
            borderRadius: 20,
            padding: '48px 40px',
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--danger-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 22,
              color: 'var(--navy)',
              marginBottom: 8,
            }}>
              Something went wrong
            </h2>
            <p style={{
              fontSize: 14,
              color: 'var(--text-mut)',
              lineHeight: 1.5,
              marginBottom: 24,
            }}>
              An unexpected error occurred. Please try refreshing the page.
            </p>
            {this.state.error && (
              <div style={{
                background: 'var(--cream)',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 24,
                textAlign: 'left',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mut)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Error Details</div>
                <div style={{ fontSize: 12, color: 'var(--danger)', fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-word' }}>
                  {this.state.error.message}
                </div>
              </div>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              style={{
                padding: '12px 28px',
                background: 'var(--navy)',
                color: 'var(--offwhite)',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
