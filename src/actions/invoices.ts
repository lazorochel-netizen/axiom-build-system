'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createInvoice(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vehicleId  = formData.get('vehicle_id') as string || null
  const customerId = formData.get('customer_id') as string || null
  const dueDate    = formData.get('due_date') as string || null
  const notes      = formData.get('notes') as string || null

  // Parse line items from repeated fields: item_desc[], item_qty[], item_price[]
  const descs  = formData.getAll('item_desc')  as string[]
  const qtys   = formData.getAll('item_qty')   as string[]
  const prices = formData.getAll('item_price') as string[]

  const lineItems = descs
    .map((desc, i) => ({
      description: desc,
      quantity:    parseFloat(qtys[i] ?? '1') || 1,
      unit_price:  parseFloat(prices[i] ?? '0') || 0,
    }))
    .filter(item => item.description.trim())

  const totalAmount = lineItems.length > 0
    ? lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    : parseFloat(formData.get('total_amount') as string) || 0

  const { data: invoice } = await (supabase.from('invoices') as any).insert({
    vehicle_id:   vehicleId,
    customer_id:  customerId,
    created_by:   user.id,
    total_amount: totalAmount,
    status:       'draft',
    due_date:     dueDate || null,
    notes:        notes || null,
  }).select('id').single()

  // Insert line items if any
  if (invoice && lineItems.length > 0) {
    await (supabase.from('invoice_items') as any).insert(
      lineItems.map(item => ({ ...item, invoice_id: invoice.id }))
    )
  }

  revalidatePath('/ops/invoices')
}

export async function convertQuotationToInvoice(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const quotationId = formData.get('quotation_id') as string
  const dueDate     = formData.get('due_date') as string || null

  const { data: q } = await (supabase.from('quotations') as any)
    .select('*')
    .eq('id', quotationId)
    .single() as { data: Record<string, any> | null }

  if (!q) return

  await (supabase.from('invoices') as any).insert({
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

export async function updateInvoiceStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const invoiceId = formData.get('invoice_id') as string
  const status    = formData.get('status') as string

  await (supabase.from('invoices') as any).update({ status }).eq('id', invoiceId)
  revalidatePath('/ops/invoices')
}

export async function updateQuotationStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const quotationId = formData.get('quotation_id') as string
  const status      = formData.get('status') as string

  await (supabase.from('quotations') as any).update({ status }).eq('id', quotationId)
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

  await (supabase.from('invoices') as any).insert({
    vehicle_id:   vehicleId,
    customer_id:  null,
    created_by:   user.id,
    total_amount: log.total_amount ?? 0,
    status:       'draft',
    due_date:     dueDate || null,
    notes:        `From Build Log: ${log.name}\nCustomer: ${log.customer_name ?? '—'}\nVehicle: ${log.vehicle_info ?? '—'}\nSpec: ${log.spec_label ?? '—'}`