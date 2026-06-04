'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createInvoice(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vehicleId   = formData.get('vehicle_id') as string || null
  const customerId  = formData.get('customer_id') as string || null
  const amount      = parseFloat(formData.get('total_amount') as string) || 0
  const dueDate     = formData.get('due_date') as string || null
  const notes       = formData.get('notes') as string || null

  await supabase.from('invoices').insert({
    vehicle_id:   vehicleId,
    customer_id:  customerId,
    created_by:   user.id,
    total_amount: amount,
    status:       'draft',
    due_date:     dueDate || null,
    notes:        notes || null,
  })

  revalidatePath('/ops/invoices')
}

export async function convertQuotationToInvoice(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const quotationId = formData.get('quotation_id') as string
  const dueDate     = formData.get('due_date') as string || null

  const { data: q } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .single()

  if (!q) return

  await supabase.from('invoices').insert({
    vehicle_id:    q.vehicle_id,
    customer_id:   q.customer_id,
    quotation_id:  quotationId,
    created_by:    user.id,
    total_amount:  q.total_amount,
    status:        'draft',
    due_date:      dueDate || null,
    notes:         q.notes || null,
  })

  revalidatePath('/ops/invoices')
  revalidatePath('/ops/quotations')
}

export async function createInvoiceFromBuildLog(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const buildLogId  = formData.get('build_log_id') as string
  const vehicleId   = formData.get('vehicle_id') as string || null
  const dueDate     = formData.get('due_date') as string || null

  const admin = createAdminClient()
  const { data: log } = await (admin.from('build_logs') as any)
    .select('*')
    .eq('id', buildLogId)
    .single()

  if (!log) return

  await supabase.from('invoices').insert({
    vehicle_id:   vehicleId,
    customer_id:  null,
    created_by:   user.id,
    total_amount: log.total_amount ?? 0,
    status:       'draft',
    due_date:     dueDate || null,
    notes:        `From Build Log: ${log.name}\nCustomer: ${log.customer_name ?? '—'}\nVehicle: ${log.vehicle_info ?? '—'}\nSpec: ${log.spec_label ?? '—'}`,
  })

  revalidatePath('/ops/invoices')
}
