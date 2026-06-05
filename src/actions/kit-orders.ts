'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createRawClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { KitStatus } from '@/types/database'

const KIT_STATUS_LABELS: Record<KitStatus, string> = {
  designing:  'Designing',
  production: 'In Production',
  completed:  'Kit Completed',
  dispatched: 'Dispatched',
}

export async function updateKitStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vehicleId         = formData.get('vehicle_id') as string
  const status            = formData.get('status') as KitStatus
  const manufacturerNotes = (formData.get('manufacturer_notes') as string) || null

  // Use raw admin client to bypass RLS for upsert
  const admin = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await admin
    .from('kit_orders')
    .upsert({
      vehicle_id:         vehicleId,
      status,
      manufacturer_notes: manufacturerNotes,
      updated_by:         user.id,
    }, { onConflict: 'vehicle_id' })

  if (error) {
    console.error('[updateKitStatus]', error.message)
    return
  }

  // Log to activity trail
  await admin.from('activity_log').insert({
    vehicle_id: vehicleId,
    user_id:    user.id,
    action:     'kit_status_updated',
    old_value:  null,
    new_value:  { status, manufacturer_notes: manufacturerNotes },
  })

  // Email ops manager
  const { data: vehicle } = await admin
    .from('vehicles')
    .select('job_id, vehicle_year, vehicle_make, vehicle_model')
    .eq('id', vehicleId)
    .single()

  if (vehicle && process.env.EMAIL_OPS) {
    const { emailKitStatusChanged } = await import('@/lib/email')
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    await emailKitStatusChanged({
      jobId:        vehicle.job_id,
      vehicleYear:  vehicle.vehicle_year,
      vehicleMake:  vehicle.vehicle_make,
      vehicleModel: vehicle.vehicle_model,
      status,
      statusLabel:  KIT_STATUS_LABELS[status],
      notes:        manufacturerNotes,
      jobUrl:       `${baseUrl}/ops/jobs/${vehicleId}`,
    })
  }

  revalidatePath(`/manufacturer/dashboard`)
  revalidatePath(`/ops/jobs/${vehicleId}`)
}
