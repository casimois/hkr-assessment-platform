import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  // Auth check
  const userClient = await createServerSupabaseClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only PNG, JPEG, WebP, and GIF images are allowed' }, { status: 400 })
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 5MB' }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()

    // Ensure bucket exists
    const { data: buckets } = await admin.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === 'question-images')
    if (!bucketExists) {
      await admin.storage.createBucket('question-images', {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: allowedTypes,
      })
    }

    // Upload file
    const ext = file.name.split('.').pop() || 'png'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const path = `questions/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await admin.storage
      .from('question-images')
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = admin.storage
      .from('question-images')
      .getPublicUrl(path)

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('Upload handler error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
