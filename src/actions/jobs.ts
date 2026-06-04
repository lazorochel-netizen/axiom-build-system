'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createJob(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const buildType = formData.get('build_type') as string

  // 0. Generate unique job ID (AXM-XXXXX)
  const { count } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
  const jobId = `AXM-${String((count ?? 0) + 1).padStart(5, '0')}`

  // 1. Create customer
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({
      name:  formData.get('customer_name') as string,
      email: (formData.get('customer_email') as string) || null,
      phone: (formData.get('customer_phone') as string) || null,
    })
    .select('id')
    .single()

  if (customerError) redirect(`/ops/jobs/new?error=${encodeURIComponent('Could not create customer: ' + customerError.message)}`)

  // 2. Create vehicle
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .insert({
      job_id:                    jobId,
      vehicle_make:              formData.get('vehicle_make') as string,
      vehicle_model:             formData.get('vehicle_model') as string,
      vehicle_year:              Number(formData.get('vehicle_year')) || null,
      vin:                       (formData.get('vin') as string) || null,
      stock_number:              (formData.get('stock_number') as string) || null,
      registration:              (formData.get('registration') as string) || null,
      build_type:                buildType,
      estimated_completion_date: (formData.get('estimated_completion_date') as string) || null,
      customer_id:               customer.id,
      created_by:                user.id,
      build_status:              'pending',
    })
    .select('id')
    .single()

  if (vehicleError) redirect(`/ops/jobs/new?error=${encodeURIComponent('Could not create job: ' + vehicleError.message)}`)

  // 3. Generate QR code
  await supabase
    .from('qr_codes')
    .insert({ vehicle_id: vehicle.id, generated_by: user.id, is_active: true })

  // 3b. Log job creation
  await supabase.from('activity_log').insert({
    vehicle_id: vehicle.id,
    user_id:    user.id,
    action:     'job_created',
    old_value:  null,
    new_value:  { job_id: jobId, build_type: buildType },
  })

  // 4. Auto-create standard tasks
  const standardTasks = [
    { task_name: 'Conversion Kit Fitted',   task_category: 'Structure & Materials', task_order: 1 },
    { task_name: 'Electric & Water Fitted', task_category: 'Electrical & Plumbing', task_order: 2 },
    { task_name: 'Upgrades',               task_category: 'Upgrades',              task_order: 3 },
  ]

  await supabase.from('tasks').insert(
    standardTasks.map(t => ({
      ...t,
      vehicle_id:    vehicle.id,
      role_required: 'fitter' as const,
      is_required:   true,
      photo_required: false,
      status:        'pending' as const,
    }))
  )

  redirect(`/ops/jobs/${vehicle.id}`)
}

export async function updateBuildStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vehicleId   = formData.get('vehicle_id') as string
  const buildStatus = formData.get('build_status') as string

  await supabase.from('vehicles').update({
    build_status: buildStatus,
    ...(buildStatus === 'delivered' ? { handover_date: new Date().toISOString().split('T')[0] } : {}),
  }).eq('id', vehicleId)

  // Log status change
  await supabase.from('activity_log').insert({
    vehicle_id: vehicleId,
    user_id:    user.id,
    action:     'status_changed',
    old_value:  null,
    new_value:  { status: buildStatus },
  })

  revalidatePath(`/ops/jobs/${vehicleId}`)
}

export async function saveJobNotes(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vehicleId = formData.get('vehicle_id') as string
  const notes     = formData.get('notes') as string

  await supabase.from('vehicles').update({ notes }).eq('id', vehicleId)

  await supabase.from('activity_log').insert({
    vehicle_id: vehicleId,
    user_id:    user.id,
    action:     'notes_saved',
    old_value:  null,
    new_value:  { notes },
  })

  revalidatePath(`/ops/jobs/${vehicleId}`)
}

export async function deleteJob(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vehicleId = formData.get('vehicle_id') as string

  // Delete in order: tasks, qr_codes, photos, vehicle (customer kept)
  await supabase.from('tasks').delete().eq('vehicle_id', vehicleId)
  await supabase.from('qr_codes').delete().eq('vehicle_id', vehicleId)
  await supabase.from('photos').delete().eq('vehicle_id', vehicleId)
  await supabase.from('vehicles').delete().eq('id', vehicleId)

  redirect('/ops/jobs')
}
