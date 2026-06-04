'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createJob(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const buildType = formData.get('build_type') as string

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

  if (customerError) throw new Error(`Customer creation failed: ${customerError.message}`)

  // 2. Create vehicle
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .insert({
      job_id:                    '',
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

  if (vehicleError) throw new Error(`Vehicle creation failed: ${vehicleError.message}`)

  // 3. Generate QR code
  await supabase
    .from('qr_codes')
    .insert({ vehicle_id: vehicle.id, generated_by: user.id, is_active: true })

  // 4. Auto-populate standard tasks from templates
  const { data: templates } = await supabase
    .from('task_templates')
    .select('task_name, task_category, task_order, role_required, is_required, photo_required')
    .eq('build_type', buildType)
    .eq('is_upgrade', false)   // standard tasks only — upgrades added separately
    .order('task_order', { ascending: true })

  if (templates && templates.length > 0) {
    const tasks = templates.map(t => ({
      vehicle_id:     vehicle.id,
      task_name:      t.task_name,
      task_category:  t.task_category,
      task_order:     t.task_order,
      role_required:  t.role_required,
      is_required:    t.is_required,
      photo_required: t.photo_required,
      status:         'pending' as const,
    }))

    const { error: tasksError } = await supabase.from('tasks').insert(tasks)
    if (tasksError) throw new Error(`Task creation failed: ${tasksError.message}`)
  }

  redirect(`/ops/jobs/${vehicle.id}`)
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
