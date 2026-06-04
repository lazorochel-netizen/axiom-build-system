'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function assignFitterToJob(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vehicleId = formData.get('vehicle_id') as string
  const userId    = formData.get('user_id') as string

  await supabase.from('job_fitters').upsert({ vehicle_id: vehicleId, user_id: userId })
  revalidatePath(`/ops/jobs/${vehicleId}`)
}

export async function removeFitterFromJob(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vehicleId = formData.get('vehicle_id') as string
  const userId    = formData.get('user_id') as string

  await supabase.from('job_fitters').delete().eq('vehicle_id', vehicleId).eq('user_id', userId)
  revalidatePath(`/ops/jobs/${vehicleId}`)
}
