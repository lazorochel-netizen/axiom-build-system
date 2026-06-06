'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function uploadTaskPhoto(formData: FormData) {
  const file      = formData.get('photo') as File
  const taskId    = formData.get('task_id') as string
  const vehicleId = formData.get('vehicle_id') as string
  const token     = formData.get('token') as string

  if (!file || file.size === 0) return

  const ext      = file.name.split('.').pop() ?? 'jpg'
  const fileName = `${vehicleId}/${taskId}/${Date.now()}.${ext}`
  const bytes    = await file.arrayBuffer()

  // Identify uploader: prefer PIN check-in cookie, fall back to auth session
  const { getCheckedInFitter } = await import('@/actions/fitter-checkin')
  const checkedIn = await getCheckedInFitter()
  let uploadedBy: string | null = checkedIn?.id ?? null

  if (!uploadedBy) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    uploadedBy = user?.id ?? null
  }

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('job-photos')
    .upload(fileName, bytes, { contentType: file.type, upsert: false })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  const { data: { publicUrl } } = admin.storage
    .from('job-photos')
    .getPublicUrl(fileName)

  await (admin.from('photos') as any).insert({
    vehicle_id:          vehicleId,
    task_id:             taskId,
    image_url:           publicUrl,
    uploaded_by:         uploadedBy,
    is_customer_visible: false,
  })

  revalidatePath(`/job/${token}`)
}

export async function togglePhotoVisibility(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const photoId   = formData.get('photo_id') as string
  const vehicleId = formData.get('vehicle_id') as string
  const visible   = formData.get('visible') === 'true'

  await (supabase.from('photos') as any).update({ is_customer_visible: !visible }).eq('id', photoId)
  revalidatePath(`/ops/jobs/${vehicleId}`)
}
