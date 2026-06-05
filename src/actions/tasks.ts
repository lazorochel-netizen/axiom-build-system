'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { emailAllTasksComplete } from '@/lib/email'

export async function completeTask(taskId: string, vehicleToken: string) {
  const admin = createAdminClient()

  // Identify fitter: prefer PIN check-in cookie, fall back to auth session
  const { getCheckedInFitter } = await import('@/actions/fitter-checkin')
  const checkedIn = await getCheckedInFitter()
  let completedBy: string | null = checkedIn?.id ?? null

  if (!completedBy) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    completedBy = user?.id ?? null
  }

  await (admin.from('tasks') as any).update({
    status:       'completed',
    completed_by: completedBy,
    completed_at: new Date().toISOString(),
  }).eq('id', taskId)

  // Log to activity trail
  if (completedBy) {
    const { data: task } = await (admin.from('tasks') as any)
      .select('vehicle_id')
      .eq('id', taskId)
      .single()
    if (task?.vehicle_id) {
      await (admin.from('activity_log') as any).insert({
        vehicle_id: task.vehicle_id,
        task_id:    taskId,
        user_id:    completedBy,
        action:     'task_completed',
        old_value:  null,
        new_value:  { status: 'completed', via: 'qr' },
      })
    }
  }

  revalidatePath(`/job/${vehicleToken}`)
}

export async function uncompleteTask(taskId: string, vehicleToken: string) {
  const admin = createAdminClient()

  await (admin.from('tasks') as any).update({
    status:       'pending',
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

  if (status === 'completed') {
    await supabase.from('activity_log').insert({
      vehicle_id: vehicleId,
      task_id:    taskId,
      user_id:    user.id,
      action:     'task_completed',
      old_value:  null,
      new_value:  { status },
    })

    // Check if ALL tasks for this vehicle are now complete → email ops
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('status')
      .eq('vehicle_id', vehicleId)

    const allDone = allTasks && allTasks.length > 0 && allTasks.every(t => t.status === 'completed')
    if (allDone) {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('job_id, vehicle_year, vehicle_make, vehicle_model')
        .eq('id', vehicleId)
        .single()
      if (vehicle) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://axiom-build-system.vercel.app'
        await emailAllTasksComplete({
          jobId:        vehicle.job_id,
          vehicleYear:  vehicle.vehicle_year,
          vehicleMake:  vehicle.vehicle_make,
          vehicleModel: vehicle.vehicle_model,
          jobUrl:       `${baseUrl}/ops/jobs/${vehicleId}`,
        })
      }
    }
  }

  revalidatePath(`/ops/jobs/${vehicleId}`)
}

export async function deleteTask(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const taskId    = formData.get('task_id') as string
  const vehicleId = formData.get('vehicle_id') as string

  await supabase.from('tasks').delete().eq('id', taskId)
  revalidatePath(`/ops/jobs/${vehicleId}`)
}

export async function editTaskName(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const taskId    = formData.get('task_id') as string
  const vehicleId = formData.get('vehicle_id') as string
  const taskName  = formData.get('task_name') as string
  const taskCategory = formData.get('task_category') as string

  await supabase.from('tasks').update({ task_name: taskName, task_category: taskCategory }).eq('id', taskId)
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
    due_date:       (formData.get('due_date') as string) || null,
    status:         'pending',
  })

  revalidatePath(`/ops/jobs/${vehicleId}`)
}
