import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { completeTask, uncompleteTask } from '@/actions/tasks'
import type { TaskStatus } from '@/types/database'
import FitterTaskCard from '@/components/FitterTaskCard'

export default async function FitterJobPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: qr } = await supabase
    .from('qr_codes')
    .select('vehicle_id, is_active')
    .eq('token', token)
    .single()

  if (!qr || !qr.is_active) notFound()

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select(`
      job_id, vehicle_make, vehicle_model, vehicle_year,
      build_status, build_type, notes,
      tasks ( id, task_name, task_category, task_order, status, photo_required, notes )
    `)
    .eq('id', qr.vehicle_id)
    .single()

  if (!vehicle) notFound()

  const tasks = (vehicle.tasks ?? []).sort(
    (a: { task_order: number }, b: { task_order: number }) => a.task_order - b.task_order
  )

  const done  = tasks.filter((t: { status: TaskStatus }) => t.status === 'completed').length
  const total = tasks.length
  const allDone = total > 0 && done === total

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-slate-900">
          {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">{vehicle.job_id} · {vehicle.build_type}</p>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Progress</span>
            <span>{done}/{total} tasks complete</span>
          </div>
          <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: total ? `${(done / total) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Additional Task Notes from ops */}
        {vehicle.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Task Notes from Ops</p>
            <p className="text-sm text-amber-900 whitespace-pre-line">{vehicle.notes}</p>
          </div>
        )}

        {/* All done banner */}
        {allDone && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 font-medium text-center">
            ✓ All tasks complete — notify your supervisor
          </div>
        )}

        {/* Task list */}
        <div className="space-y-2">
          {tasks.map((task: {
            id: string
            task_name: string
            task_category: string
            status: TaskStatus
            photo_required: boolean
            notes: string | null
          }) => {
            const completeWithId   = completeTask.bind(null, task.id, token)
            const uncompleteWithId = uncompleteTask.bind(null, task.id, token)

            return (
              <FitterTaskCard
                key={task.id}
                task={task}
                vehicleId={qr.vehicle_id}
                token={token}
                completeAction={completeWithId}
                uncompleteAction={uncompleteWithId}
              />
            )
          })}
        </div>

        {total === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">No tasks assigned to this job yet.</p>
        )}
      </div>
    </div>
  )
}
