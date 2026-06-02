'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function uploadTaskPhoto(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file      = formData.get('photo') as File
  const taskId    = formData.get('task_id') as string
  const vehicleId = formData.get('vehicle_id') as string
  const token     = formData.get('token') as string

  if (!file || file.size === 0) return

  const ext      = file.name.split('.').pop() ?? 'jpg'
  const fileName = `${vehicleId}/${taskId}/${Date.now()}.${ext}`
  const bytes    = await file.arrayBuffer()

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('job-photos')
    .upload(fileName, bytes, { contentType: file.type, upsert: false })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  const { data: { publicUrl } } = admin.storage
    .from('job-photos')
    .getPublicUrl(fileName)

  await supabase.from('photos').insert({
    vehicle_id:          vehicleId,
    task_id:             taskId,
    image_url:           publicUrl,
    uploaded_by:         user.id,
    is_customer_visible: false,
  })

  revalidatePath(`/job/${token}`)
}
