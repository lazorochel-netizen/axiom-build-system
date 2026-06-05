'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const STATUS_LABELS: Record<string, string> = {
  pending:                'Build Pending',
  kit_designing:          'Kit Being Designed',
  kit_production:         'Kit In Production',
  kit_dispatched:         'Kit Dispatched',
  in_progress:            'Build In Progress',
  waiting_on_parts:       'Waiting for Parts',
  waiting_on_compliance:  'In Compliance Review',
  completed:              'Build Complete',
  delivered:              'Delivered',
}

export async function sendCustomerUpdate(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vehicleId     = formData.get('vehicle_id') as string
  const customMessage = (formData.get('custom_message') as string)?.trim() || null

  // Fetch vehicle + customer
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select(`
      job_id, vehicle_year, vehicle_make, vehicle_model,
      build_status, customers ( name, email, portal_token )
    `)
    .eq('id', vehicleId)
    .single()

  if (!vehicle) return redirect(`/ops/jobs/${vehicleId}?error=Job+not+found`)

  const customer = vehicle.customers as { name: string; email: string | null; portal_token: string } | null

  if (!customer?.email) {
    return redirect(`/ops/jobs/${vehicleId}?error=${encodeURIComponent('Customer has no email address on file')}`)
  }

  const baseUrl    = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const portalUrl  = `${baseUrl}/portal/${customer.portal_token}`
  const statusLabel = STATUS_LABELS[vehicle.build_status] ?? vehicle.build_status.replace(/_/g, ' ')

  const { emailManualCustomerUpdate } = await import('@/lib/email')
  await emailManualCustomerUpdate({
    customerEmail: customer.email,
    customerName:  customer.name,
    jobId:         vehicle.job_id,
    vehicleYear:   vehicle.vehicle_year,
    vehicleMake:   vehicle.vehicle_make,
    vehicleModel:  vehicle.vehicle_model,
    buildStatus:   vehicle.build_status,
    statusLabel,
    customMessage,
    portalUrl,
  })

  // Log it
  await supabase.from('activity_log').insert({
    vehicle_id: vehicleId,
    user_id:    user.id,
    action:     'customer_email_sent',
    old_value:  null,
    new_value:  { status: vehicle.build_status, has_message: !!customMessage },
  })

  revalidatePath(`/ops/jobs/${vehicleId}`)
  redirect(`/ops/jobs/${vehicleId}?sent=1`)
}
