'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createRawClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { LeadStage, LeadSource } from '@/types/database'

function adminClient() {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function requireSales() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await (supabase.from('users') as any)
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (profile?.role !== 'sales') redirect('/login')
  return user
}

/** Sales creates a new lead. */
export async function createLead(formData: FormData) {
  const user = await requireSales()
  const admin = adminClient()

  const { data: lead, error } = await admin.from('leads').insert({
    customer_name:  (formData.get('customer_name') as string).trim(),
    customer_email: (formData.get('customer_email') as string)?.trim() || null,
    customer_phone: (formData.get('customer_phone') as string)?.trim() || null,
    vehicle_make:   (formData.get('vehicle_make') as string)?.trim() || null,
    vehicle_model:  (formData.get('vehicle_model') as string)?.trim() || null,
    vehicle_year:   Number(formData.get('vehicle_year')) || null,
    build_type:     (formData.get('build_type') as string) || null,
    budget:         (formData.get('budget') as string)?.trim() || null,
    source:         (formData.get('source') as LeadSource) || 'other',
    stage:          'new' as LeadStage,
    notes:          (formData.get('notes') as string)?.trim() || null,
    assigned_to:    user.id,
    created_by:     user.id,
  }).select('id').single()

  if (error || !lead) {
    redirect('/sales/leads/new?error=Could not create lead')
  }

  revalidatePath('/sales/dashboard')
  redirect(`/sales/leads/${lead.id}`)
}

/** Move a lead to a new stage. */
export async function updateLeadStage(formData: FormData) {
  await requireSales()
  const admin = adminClient()

  const id    = formData.get('id') as string
  const stage = formData.get('stage') as LeadStage

  await admin.from('leads').update({ stage }).eq('id', id)

  revalidatePath('/sales/dashboard')
  revalidatePath(`/sales/leads/${id}`)
}

/** Update lead details and notes. */
export async function updateLead(formData: FormData) {
  await requireSales()
  const admin = adminClient()

  const id = formData.get('id') as string

  await admin.from('leads').update({
    customer_name:  (formData.get('customer_name') as string)?.trim(),
    customer_email: (formData.get('customer_email') as string)?.trim() || null,
    customer_phone: (formData.get('customer_phone') as string)?.trim() || null,
    vehicle_make:   (formData.get('vehicle_make') as string)?.trim() || null,
    vehicle_model:  (formData.get('vehicle_model') as string)?.trim() || null,
    vehicle_year:   Number(formData.get('vehicle_year')) || null,
    build_type:     (formData.get('build_type') as string) || null,
    budget:         (formData.get('budget') as string)?.trim() || null,
    source:         (formData.get('source') as LeadSource) || 'other',
    notes:          (formData.get('notes') as string)?.trim() || null,
  }).eq('id', id)

  revalidatePath('/sales/dashboard')
  revalidatePath(`/sales/leads/${id}`)
}

/**
 * Convert a won lead into an Ops job.
 * Creates customer → vehicle → QR code → activity log, marks lead as won.
 */
export async function convertLeadToJob(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = adminClient()
  const leadId = formData.get('lead_id') as string

  // Fetch the lead
  const { data: lead } = await admin
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (!lead) redirect(`/sales/leads/${leadId}?error=Lead not found`)

  // 1. Create customer
  const { data: customer, error: customerError } = await admin
    .from('customers')
    .insert({
      name:  lead.customer_name,
      email: lead.customer_email,
      phone: lead.customer_phone,
    })
    .select('id')
    .single()

  if (customerError || !customer) {
    redirect(`/sales/leads/${leadId}?error=Could not create customer`)
  }

  // 2. Create vehicle (job_id assigned by DB trigger)
  const { data: vehicle, error: vehicleError } = await admin
    .from('vehicles')
    .insert({
      job_id:       '',
      vehicle_make:  lead.vehicle_make  ?? 'Unknown',
      vehicle_model: lead.vehicle_model ?? 'Unknown',
      vehicle_year:  lead.vehicle_year,
      build_type:    lead.build_type    ?? 'Unknown',
      customer_id:   customer.id,
      created_by:    user.id,
      build_status:  'pending',
    })
    .select('id, job_id')
    .single()

  if (vehicleError || !vehicle) {
    redirect(`/sales/leads/${leadId}?error=Could not create job`)
  }

  // 3. Generate QR code
  await admin.from('qr_codes').insert({
    vehicle_id:   vehicle.id,
    generated_by: user.id,
    is_active:    true,
  })

  // 4. Activity log
  await admin.from('activity_log').insert({
    vehicle_id: vehicle.id,
    user_id:    user.id,
    action:     'job_created_from_lead',
    old_value:  null,
    new_value:  { lead_id: leadId, job_id: vehicle.job_id, build_type: lead.build_type },
  })

  // 5. Mark lead as won + store the vehicle reference
  await admin.from('leads').update({
    stage:                'won',
    converted_vehicle_id: vehicle.id,
    converted_at:         new Date().toISOString(),
  }).eq('id', leadId)

  revalidatePath('/sales/dashboard')
  revalidatePath('/ops/dashboard')
  revalidatePath('/ops/jobs')

  redirect(`/ops/jobs/${vehicle.id}`)
}
