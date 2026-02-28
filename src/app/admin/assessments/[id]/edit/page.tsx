'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase, isSupabaseConfigured, Assessment } from '@/lib/supabase'
import AssessmentBuilder from '@/components/admin/AssessmentBuilder'

export default function EditAssessmentPage() {
  const params = useParams()
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      if (!isSupabaseConfigured || !params.id) { setLoading(false); return }
      const { data } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', params.id as string)
        .single()
      if (data) setAssessment(data as Assessment)
      setLoading(false)
    }
    fetch()
  }, [params.id])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border-light)', borderTopColor: 'var(--navy)', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!assessment) {
    return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-mut)' }}>Assessment not found</div>
  }

  return <AssessmentBuilder existingAssessment={assessment} />
}
