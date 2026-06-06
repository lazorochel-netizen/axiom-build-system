'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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
    .single() as { data: {
      job_id: string
      vehicle_year: number | null
      vehicle_make: string
      vehicle_model: string
      build_status: string
      customers: { name: string; email: string | null; portal_token: string } | null
    } | null, error: unknown }

  if (!vehicle) return redirect(`/ops/jobs/${vehicleId}?error=Job+not+found`)

  const customer = vehicle.customers

  if (!customer?.email) {
    return redirect(`/ops/jobs/${vehicleId}?error=${encodeURIComponent('Customer has no email address on file')}`)
  }

  const baseUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const portalUrl = `${baseUrl}/portal/${customer.portal_token}`

  const { buildCustomerUpdateHtml } = await import('@/lib/email-templates')
  const html = buildCustomerUpdateHtml({
    customerName:  customer.name,
    jobId:         vehicle.job_id,
    vehicleYear:   vehicle.vehicle_year,
    vehicleMake:   vehicle.vehicle_make,
    vehicleModel:  vehicle.vehicle_model,
    buildStatus:   vehicle.build_status,
    customMessage,
    portalUrl,
    workshopPhone: process.env.NEXT_PUBLIC_WORKSHOP_PHONE,
  })

  // Send via Resend
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const FROM = process.env.EMAIL_FROM ?? 'Axiom Builds <builds@axiomgroup.com.au>'
    await resend.emails.send({
      from:    FROM,
      to:      customer.email,
      subject: `Build update for your ${vehicle.vehicle_make} ${vehicle.vehicle_model} — ${vehicle.job_id}`,
      html,
    })
  }

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
