'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const COOKIE_NAME = 'fitter_session'
const COOKIE_MAX_AGE = 60 * 60 * 14  // 14 hours — covers a full shift

export async function fitterCheckIn(formData: FormData) {
  const fitterId = formData.get('fitter_id') as string
  const pin      = formData.get('pin') as string
  const token    = formData.get('token') as string  // QR job token, to redirect back

  if (!fitterId || !pin) return redirect(`/job/${token}?error=missing`)

  const admin = createAdminClient()
  const { data: fitter } = await (admin.from('users') as any)
    .select('id, name, pin')
    .eq('id', fitterId)
    .single()

  if (!fitter || fitter.pin !== pin.trim()) {
    return redirect(`/job/${token}?error=wrong_pin`)
  }

  // Set a secure cookie storing the verified fitter ID + name
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, JSON.stringify({ id: fitter.id, name: fitter.name }), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   COOKIE_MAX_AGE,
    path:     '/',
  })

  redirect(`/job/${token}`)
}

export async function fitterCheckOut(formData: FormData) {
  const token = formData.get('token') as string
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  redirect(`/job/${token}`)
}

export async function getCheckedInFitter(): Promise<{ id: string; name: string } | null> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get(COOKIE_NAME)?.value
    if (!raw) return null
    return JSON.parse(raw) as { id: string; name: string }
  } catch {
    return null
  }
}
