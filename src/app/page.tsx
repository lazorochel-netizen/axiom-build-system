import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Root page — redirect based on auth state and role.
 */
export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await (supabase.from('users') as any)
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (profile?.role === 'operations_manager') {
    redirect('/ops/dashboard')
  }

  if (profile?.role === 'fitter') {
    redirect('/fitter/dashboard')
  }

  if (profile?.role === 'manufacturer') {
    redirect('/manufacturer/dashboard')
  }

  // Unknown or null role — send to login
  redirect('/login')
}
