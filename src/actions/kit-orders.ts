'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createRawClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { KitStatus, BuildStatus } from '@/types/database'

const KIT_STATUS_LABELS: Record<KitStatus, string> = {
  designing:  'Designing',
  production: 'In Production',
  completed:  'Kit Completed',
  dispatched: 'Dispatched',
}

// Map kit status directly to unified build_status
const KIT_TO_JOB_STATUS: Record<KitStatus, BuildStatus> = {
  designing:  'kit_designing',
  production: 'kit_production',
  completed:  'kit_dispatched',   // kit done at factory → treat as dispatched-ready
  dispatched: 'kit_dispatched',
}

// Only auto-update if job hasn't moved past kit/pre-build stages
const AUTO_UPDATE_ALLOWED: BuildStatus[] = [
  'pending', 'kit_designing', 'kit_production', 'kit_dispatched', 'waiting_on_parts'
]

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
    return
  }

  // Auto-update job build_status if it's still in a pre-build stage
  const { data: vehicle } = await admin
    .from('vehicles')
    .select('job_id, vehicle_year, vehicle_make, vehicle_model, build_status')
    .eq('id', vehicleId)
    .single()

  const newJobStatus = KIT_TO_JOB_STATUS[status]
  const currentJobStatus = vehicle?.build_status as BuildStatus | undefined

  if (currentJobStatus && AUTO_UPDATE_ALLOWED.includes(currentJobStatus) && newJobStatus !== currentJobStatus) {
    await admin
      .from('vehicles')
      .update({ build_status: newJobStatus })
      .eq('id', vehicleId)
  }

  // Log to activity trail
  await admin.from('activity_log').insert({
    vehicle_id: vehicleId,
    user_id:    user.id,
    action:     'kit_status_updated',
    old_value:  null,
    new_value:  { kit_status: status, job_status_updated_to: newJobStatus, manufacturer_notes: manufacturerNotes },
  })

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

  revalidatePath('/manufacturer/dashboard')
  revalidatePath(`/ops/jobs/${vehicleId}`)
  revalidatePath('/ops/jobs')
  revalidatePath('/ops/dashboard')
}
