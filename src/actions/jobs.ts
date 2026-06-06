'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { emailJobCreated, emailCustomerStatusUpdate } from '@/lib/email'

export async function createJob(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const buildType = formData.get('build_type') as string

  // 1. Create customer
  const { data: customer, error: customerError } = await (supabase.from('customers') as any)
    .insert({
      name:  formData.get('customer_name') as string,
      email: (formData.get('customer_email') as string) || null,
      phone: (formData.get('customer_phone') as string) || null,
    })
    .select('id')
    .single() as { data: { id: string } | null, error: { message: string } | null }

  if (customerError) redirect(`/ops/jobs/new?error=${encodeURIComponent('Could not create customer: ' + customerError.message)}`)

  // 2. Create vehicle — job_id is set by DB trigger
  const { data: vehicle, error: vehicleError } = await (supabase.from('vehicles') as any)
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
      customer_id:               customer!.id,
      created_by:                user.id,
      build_status:              'pending',
    })
    .select('id, job_id')
    .single() as { data: { id: string; job_id: string } | null, error: { message: string } | null }

  if (vehicleError) redirect(`/ops/jobs/new?error=${encodeURIComponent('Could not create job: ' + vehicleError.message)}`)

  // 3. Generate QR code
  await (supabase.from('qr_codes') as any)
    .insert({ vehicle_id: vehicle!.id, generated_by: user.id, is_active: true })

  // 4. Log job creation
  await (supabase.from('activity_log') as any).insert({
    vehicle_id: vehicle!.id,
    user_id:    user.id,
    action:     'job_created',
    old_value:  null,
    new_value:  { job_id: vehicle!.job_id, build_type: buildType },
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://axiom-build-system.vercel.app'
  await emailJobCreated({
    jobId:        vehicle!.job_id,
    vehicleYear:  Number(formData.get('vehicle_year')) || null,
    vehicleMake:  formData.get('vehicle_make') as string,
    vehicleModel: formData.get('vehicle_model') as string,
    buildType,
    customerName: formData.get('customer_name') as string,
    jobUrl:       `${baseUrl}/ops/jobs/${vehicle!.id}`,
  })

  // 5. Auto-create tasks from templates
  const { data: templates } = await (supabase.from('task_templates') as any)
    .select('task_name, task_category, task_order, role_required, is_required, photo_required')
    .eq('build_type', buildType)
    .order('task_order', { ascending: true }) as { data: { task_name: string; task_category: string; task_order: number; role_required: string; is_required: boolean; photo_required: boolean }[] | null }

  const tasksToInsert = (templates && templates.length > 0)
    ? templates.map(t => ({
        vehicle_id:     vehicle!.id,
        task_name:      t.task_name,
        task_category:  t.task_category,
        task_order:     t.task_order,
        role_required:  t.role_required,
        is_required:    t.is_required,
        photo_required: t.photo_required,
        status:         'pending' as const,
      }))
    : [
        { vehicle_id: vehicle!.id, task_name: 'Conversion Kit Fitted',   task_category: 'Structure & Materials', task_order: 1, role_required: 'fitter' as const, is_required: true, photo_required: false, status: 'pending' as const },
        { vehicle_id: vehicle!.id, task_name: 'Electric & Water Fitted', task_category: 'Electrical & Plumbing', task_order: 2, role_required: 'fitter' as const, is_required: true, photo_required: false, status: 'pending' as const },
        { vehicle_id: vehicle!.id, task_name: 'Upgrades',                task_category: 'Upgrades',              task_order: 3, role_required: 'fitter' as const, is_required: true, photo_required: false, status: 'pending' as const },
      ]

  await (supabase.from('tasks') as any).insert(tasksToInsert)

  redirect(`/ops/jobs/${vehicle!.id}`)
}

export async function updateBuildStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vehicleId   = formData.get('vehicle_id') as string
  const buildStatus = formData.get('build_status') as string

  await (supabase.from('vehicles') as any).update({
    build_status: buildStatus,
    ...(buildStatus === 'delivered' ? { handover_date: new Date().toISOString().split('T')[0] } : {}),
  }).eq('id', vehicleId)

  await (supabase.from('activity_log') as any).insert({
    vehicle_id: vehicleId,
    user_id:    user.id,
    action:     'status_changed',
    old_value:  null,
    new_value:  { status: buildStatus },
  })

  // Email customer if they have an email address
  const { data: vehicleData } = await (supabase.from('vehicles') as any)
    .select('job_id, vehicle_year, vehicle_make, vehicle_model, customers(name, email, portal_token)')
    .eq('id', vehicleId)
    .single() as { data: { job_id: string; vehicle_year: number | null; vehicle_make: string; vehicle_model: string; customers: { name: string; email: string | null; portal_token: string } | null } | null }

  if (vehicleData) {
    const customer = vehicleData.customers
    if (customer?.email) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://axiom-build-system.vercel.app'
      await emailCustomerStatusUpdate({
        customerEmail: customer.email,
        customerName:  customer.name,
        jobId:         vehicleData.job_id,
        vehicleYear:   vehicleData.vehicle_year,
        vehicleMake:   vehicleData.vehicle_make,
        vehicleModel:  vehicleData.vehicle_model,
        status:        buildStatus,
        portalUrl:     `${baseUrl}/portal/${customer.portal_token}`,
      })
    }
  }

  revalidatePath(`/ops/jobs/${vehicleId}`)
}

export async function saveJobNotes(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vehicleId = formData.get('vehicle_id') as string
  const notes     = formData.get('notes') as string

  await (supabase.from('vehicles') as any).update({ notes }).eq('id', vehicleId)

  await (supabase.from('activity_log') as any).insert({
    vehicle_id: vehicleId,
    user_id:    user.id,
    action:     'notes_saved',
    old_value:  null,
    new_value:  { notes },
  })

  revalidatePath(`/ops/jobs/${vehicleId}`)
}

export async function updateJobDetails(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vehicleId  = formData.get('vehicle_id') as string
  const customerId = formData.get('customer_id') as string

  await (supabase.from('vehicles') as any).update({
    vehicle_make:              formData.get('vehicle_make') as string,
    vehicle_model:             formData.get('vehicle_model') as string,
    vehicle_year:              Number(formData.get('vehicle_year')) || null,
    vin:                       (formData.get('vin') as string) || null,
    stock_number:              (formData.get('stock_number') as string) || null,
    registration:              (formData.get('registration') as string) || null,
    build_type:                formData.get('build_type') as string,
    estimated_completion_date: (formData.get('estimated_completion_date') as string) || null,
  }).eq('id', vehicleId)

  if (customerId) {
    await (supabase.from('customers') as any).update({
      name:  formData.get('customer_name') as string,
      email: (formData.get('customer_email') as string) || null,
      phone: (formData.get('customer_phone') as string) || null,
    }).eq('id', customerId)
  }

  await (supabase.from('activity_log') as any).insert({
    vehicle_id: vehicleId,
    user_id:    user.id,
    action:     'job_details_updated',
    old_value:  null,
    new_value:  { updated_by: user.id },
  })

  revalidatePath(`/ops/jobs/${vehicleId}`)
}

export async function deleteJob(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vehicleId = formData.get('vehicle_id') as string

  await (supabase.from('tasks') as any).delete().eq('vehicle_id', vehicleId)
  await (supabase.from('qr_codes') as any).delete().eq('vehicle_id', vehicleId)
  await (supabase.from('photos') as any).delete().eq('vehicle_id', vehicleId)
  await (supabase.from('vehicles') as any).delete().eq('id', vehicleId)

  redirect('/ops/dashboard')
}
