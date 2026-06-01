import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { completeTask, uncompleteTask } from '@/actions/tasks'
import type { TaskStatus } from '@/types/database'

export default async function FitterJobPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

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
      build_status, build_type,
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
            const isComplete = task.status === 'completed'
            const completeWithId = completeTask.bind(null, task.id, token)
            const uncompleteWithId = uncompleteTask.bind(null, task.id, token)

            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl border px-4 py-3.5 flex items-start gap-3 transition-opacity ${
                  isComplete ? 'border-green-200 opacity-70' : 'border-slate-200'
                }`}
              >
                {/* Toggle button styled as checkbox */}
                <form action={isComplete ? uncompleteWithId : completeWithId}>
                  <button
                    type="submit"
                    className={`mt-0.5 w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                      isComplete
                        ? 'border-green-500 bg-green-500'
                        : 'border-slate-300 hover:border-blue-400'
                    }`}
                    aria-label={isComplete ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {isComplete && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </form>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isComplete ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {task.task_name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{task.task_category}</p>
                  {task.photo_required && !isComplete && (
                    <p className="text-xs text-amber-600 mt-1">📷 Photo required</p>
                  )}
                  {task.notes && (
                    <p className="text-xs text-slate-500 mt-1 italic">{task.notes}</p>
                  )}
                </div>
              </div>
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
