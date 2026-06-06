'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file      = formData.get('document') as File
  const vehicleId = formData.get('vehicle_id') as string
  const docName   = (formData.get('document_name') as string) || file.name
  const docType   = formData.get('document_type') as string

  if (!file || file.size === 0) return

  const ext      = file.name.split('.').pop() ?? 'pdf'
  const fileName = `${vehicleId}/${Date.now()}_${docName.replace(/\s+/g, '_')}.${ext}`
  const bytes    = await file.arrayBuffer()

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('job-documents')
    .upload(fileName, bytes, { contentType: file.type, upsert: false })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  const { data: { publicUrl } } = admin.storage
    .from('job-documents')
    .getPublicUrl(fileName)

  await (supabase.from('documents') as any).insert({
    vehicle_id:    vehicleId,
    document_name: docName,
    document_type: docType,
    file_url:      publicUrl,
    uploaded_by:   user.id,
  })

  revalidatePath(`/ops/jobs/${vehicleId}`)
}

export async function deleteDocument(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const documentId = formData.get('document_id') as string
  const vehicleId  = formData.get('vehicle_id') as string

  await (supabase.from('documents') as any).delete().eq('id', documentId)
  revalidatePath(`/ops/jobs/${vehicleId}`)
}
