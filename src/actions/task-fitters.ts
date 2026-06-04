'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function assignFitterToTask(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const taskId    = formData.get('task_id') as string
  const userId    = formData.get('user_id') as string
  const vehicleId = formData.get('vehicle_id') as string

  await supabase.from('task_fitters').upsert({ task_id: taskId, user_id: userId })
  revalidatePath(`/ops/jobs/${vehicleId}`)
}

export async function removeFitterFromTask(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const taskId    = formData.get('task_id') as string
  const userId    = formData.get('user_id') as string
  const vehicleId = formData.get('vehicle_id') as string

  await supabase.from('task_fitters').delete().eq('task_id', taskId).eq('user_id', userId)
  revalidatePath(`/ops/jobs/${vehicleId}`)
}
