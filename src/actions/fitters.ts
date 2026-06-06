'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createFitter(formData: FormData) {
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

  const admin = createAdminClient()
  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: 'fitter' },
  })

  if (authError) throw new Error(`Failed to create account: ${authError.message}`)

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

  if (authError) {
    redirect(`/ops/fitters?staff_error=${encodeURIComponent(authError.message)}`)
  }

  const pin = (formData.get('pin') as string)?.replace(/\D/g, '').slice(0, 4) || null

  const { error: dbError } = await (admin.from('users') as any).upsert({
    id: newUser.user.id,
    name,
    email,
    role,
    ...(pin ? { pin } : {}),
  })

  if (dbError) {
    redirect(`/ops/fitters?staff_error=${encodeURIComponent(dbError.message)}`)
  }

  revalidatePath('/ops/fitters')
  redirect('/ops/fitters')
}

export async function setFitterPin(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const fitterId = formData.get('fitter_id') as string
  const rawPin   = formData.get('pin') as string
  const pin      = rawPin?.replace(/\D/g, '').slice(0, 4)

  if (!fitterId) redirect('/ops/fitters?pin_error=no_fitter')
  if (!pin || pin.length !== 4) redirect('/ops/fitters?pin_error=invalid_pin')

  const { createClient: createRawClient } = await import('@supabase/supabase-js')
  const adminRaw = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await adminRaw
    .from('users')
    .update({ pin })
    .eq('id', fitterId)
    .select('id, name, pin')
    .single()

  if (error) {
    redirect(`/ops/fitters?pin_error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/ops/fitters')
}

export async function deleteFitter(fitterId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  await admin.auth.admin.deleteUser(fitterId)

  revalidatePath('/ops/fitters')
}
