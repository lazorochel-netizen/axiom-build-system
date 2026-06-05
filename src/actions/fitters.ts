'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createFitter(formData: FormData) {
  // Verify caller is an operations_manager
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.role !== 'operations_manager') {
    throw new Error('Unauthorised')
  }

  const name     = formData.get('name') as string
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  // Use admin client to create the auth user
  const admin = createAdminClient()
  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: 'fitter' },
  })

  if (authError) throw new Error(`Failed to create account: ${authError.message}`)

  // Insert user profile (trigger may have already done this, use upsert to be safe)
  await (admin.from('users') as any).upsert({
    id:   newUser.user.id,
    name,
    email,
    role: 'fitter',
  })

  revalidatePath('/ops/fitters')
}

export async function createStaff(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.role !== 'operations_manager') {
    throw new Error('Unauthorised')
  }

  const name     = formData.get('name') as string
  const email    = formData.get('email') as string
  const password = formData.get('password') as string
  const role     = formData.get('role') as string

  const admin = createAdminClient()
  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  })

  if (authError) throw new Error(`Failed to create account: ${authError.message}`)

  const pin = (formData.get('pin') as string)?.replace(/\D/g, '').slice(0, 4) || null

  await (admin.from('users') as any).upsert({
    id: newUser.user.id,
    name,
    email,
    role,
    ...(pin ? { pin } : {}),
  })

  revalidatePath('/ops/fitters')
}

export async function setFitterPin(formData: FormData) {
  // Verify caller is ops manager via auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const fitterId = formData.get('fitter_id') as string
  const pin      = (formData.get('pin') as string)?.replace(/\D/g, '').slice(0, 4)

  if (!pin || pin.length !== 4) return

  // Use admin client so RLS doesn't block updating another user's row
  const admin = createAdminClient()
  const { error } = await (admin.from('users') as any).update({ pin }).eq('id', fitterId)
  if (error) console.error('[setFitterPin] failed:', error.message)

  revalidatePath('/ops/fitters')
}

export async function deleteFitter(fitterId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Delete auth user (cascades to public.users via FK)
  await admin.auth.admin.deleteUser(fitterId)

  revalidatePath('/ops/fitters')
}
