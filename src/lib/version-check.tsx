'use client'

import { useEffect } from 'react'

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || 'unknown'
const STORAGE_KEY = 'hkr_build_id'

/**
 * Detects stale JS bundles by comparing the build ID baked into the
 * current JS bundle with the one stored in localStorage from a
 * previous page load. On first visit after a new deploy the IDs
 * won't match, so we do a hard reload to pick up the fresh chunks.
 */
export function VersionCheck() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && stored !== BUILD_ID) {
        // New deploy detected — clear old data and hard-reload
        console.log(`[version] Build changed ${stored} → ${BUILD_ID}, reloading…`)
        localStorage.setItem(STORAGE_KEY, BUILD_ID)
        window.location.reload()
        return
      }
      localStorage.setItem(STORAGE_KEY, BUILD_ID)
    } catch {
      // localStorage not available
    }
  }, [])

  return null
}
