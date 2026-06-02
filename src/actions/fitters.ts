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
  await admin.from('users').upsert({
    id:   newUser.user.id,
    name,
    email,
    role: 'fitter',
  })

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
