'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createRawClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { BackorderStatus } from '@/types/database'

function adminClient() {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function requireRole(role: 'operations_manager' | 'manufacturer') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await (supabase.from('users') as any)
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (profile?.role !== role) redirect('/login')
  return user
}

// ── Ops actions ───────────────────────────────────────────────

/** Ops creates a new restocking request. */
export async function createBackorder(formData: FormData) {
  const user = await requireRole('operations_manager')

  const kitType  = (formData.get('kit_type') as string)?.trim()
  const quantity = parseInt(formData.get('quantity') as string, 10) || 1
  const opsNotes = (formData.get('ops_notes') as string)?.trim() || null

  if (!kitType) return

  const admin = adminClient()
  await admin.from('kit_backorders').insert({
    kit_type:   kitType,
    quantity,
    ops_notes:  opsNotes,
    status:     'requested',
    created_by: user.id,
  })

  revalidatePath('/ops/dashboard')
}

/** Ops marks a back order as received (stock has arrived). */
export async function receiveBackorder(formData: FormData) {
  await requireRole('operations_manager')

  const id = formData.get('id') as string
  const admin = adminClient()
  await admin.from('kit_backorders').update({
    status:      'received',
    received_at: new Date().toISOString(),
  }).eq('id', id)

  revalidatePath('/ops/dashboard')
}

/** Ops deletes a back order request. */
export async function deleteBackorder(formData: FormData) {
  await requireRole('operations_manager')

  const id = formData.get('id') as string
  const admin = adminClient()
  await admin.from('kit_backorders').delete().eq('id', id)

  revalidatePath('/ops/dashboard')
}

// ── Manufacturer actions ───────────────────────────────────────

/** Manufacturer updates the status and adds notes to an ops-created back order. */
export async function updateBackorderStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id                  = formData.get('id') as string
  const status              = formData.get('status') as BackorderStatus
  const manufacturerNotes   = (formData.get('manufacturer_notes') as string)?.trim() || null

  // Manufacturers may only move status forward (not back to requested/received)
  const ALLOWED: BackorderStatus[] = ['acknowledged', 'in_production', 'dispatched']
  if (!ALLOWED.includes(status)) return

  const admin = adminClient()
  await admin.from('kit_backorders').update({
    status,
    manufacturer_notes: manufacturerNotes,
  }).eq('id', id)

  revalidatePath('/manufacturer/backorders')
  revalidatePath('/ops/dashboard')
}
