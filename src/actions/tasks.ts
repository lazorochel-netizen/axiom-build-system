'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function completeTask(taskId: string, vehicleToken: string) {
  const admin = createAdminClient()

  await (admin.from('tasks') as any).update({
    status:       'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', taskId)

  revalidatePath(`/job/${vehicleToken}`)
}

export async function uncompleteTask(taskId: string, vehicleToken: string) {
  const admin = createAdminClient()

  await (admin.from('tasks') as any).update({
    status: 'pending',
    completed_by: null,
    completed_at: null,
  }).eq('id', taskId)

  revalidatePath(`/job/${vehicleToken}`)
}

export async function updateTask(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const taskId    = formData.get('task_id') as string
  const vehicleId = formData.get('vehicle_id') as string
  const status    = formData.get('status') as string
  const assignedTo = formData.get('assigned_to') as string || null

  await supabase.from('tasks').update({
    status,
    assigned_to: assignedTo,
    ...(status === 'completed' ? { completed_by: user.id, completed_at: new Date().toISOString() } : {}),
    ...(status !== 'completed' ? { completed_by: null, completed_at: null } : {}),
  }).eq('id', taskId)

  revalidatePath(`/ops/jobs/${vehicleId}`)
}

export async function addTask(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vehicleId = formData.get('vehicle_id') as string

  await supabase.from('tasks').insert({
    vehicle_id:     vehicleId,
    task_name:      formData.get('task_name') as string,
    task_category:  formData.get('task_category') as string,
    task_order:     Number(formData.get('task_order')) || 0,
    role_required:  'fitter',
    is_required:    true,
    photo_required: formData.get('photo_required') === 'on',
    assigned_to:    formData.get('assigned_to') as string || null,
    status:         'pending',
  })

  revalidatePath(`/ops/jobs/${vehicleId}`)
}
