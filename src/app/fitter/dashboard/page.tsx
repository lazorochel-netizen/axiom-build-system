import { createClient } from '@/lib/supabase/server'
import type { TaskStatus } from '@/types/database'
import JobNoteForm from '@/components/JobNoteForm'

export default async function FitterDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all tasks assigned to this fitter, with their vehicle info
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      id, task_name, task_category, status, photo_required,
      vehicles ( id, job_id, vehicle_make, vehicle_model, vehicle_year, build_type,
        qr_codes ( token, is_active )
      )
    `)
    .eq('assigned_to', user!.id)
    .neq('status', 'completed')
    .order('task_order', { ascending: true })

  // Fetch job notes from activity_log
  const vehicleIds = [...new Set((tasks ?? []).map((t: any) => t.vehicles?.id).filter(Boolean))]
  const { data: notesRaw } = vehicleIds.length > 0
    ? await supabase
        .from('activity_log')
        .select('vehicle_id, new_value, created_at')
        .eq('action', 'note')
        .in('vehicle_id', vehicleIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const notesByVehicle = (notesRaw ?? []).reduce((acc: any, n: any) => {
    if (!acc[n.vehicle_id]) acc[n.vehicle_id] = []
    acc[n.vehicle_id].push({ text: n.new_value?.text ?? '', created_at: n.created_at })
    return acc
  }, {} as Record<string, { text: string; created_at: string }[]>)

  // Group tasks by vehicle
  const jobMap = new Map<string, {
    vehicle: { id: string; job_id: string; vehicle_make: string; vehicle_model: string; vehicle_year: number | null; build_type: string; qr_codes: { token: string; is_active: boolean }[] }
    tasks: { id: string; task_name: string; task_category: string; status: TaskStatus; photo_required: boolean }[]
  }>()

  for (const task of tasks ?? []) {
    const v = task.vehicles as { id: string; job_id: string; vehicle_make: string; vehicle_model: string; vehicle_year: number | null; build_type: string; qr_codes: { token: string; is_active: boolean }[] }
    if (!v) continue
    if (!jobMap.has(v.id)) jobMap.set(v.id, { vehicle: v, tasks: [] })
    jobMap.get(v.id)!.tasks.push({
      id:             task.id,
      task_name:      task.task_name,
      task_category:  task.task_category,
      status:         task.status as TaskStatus,
      photo_required: task.photo_required,
    })
  }

  const jobs = Array.from(jobMap.values())

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-slate-900">My Jobs</h1>

      {jobs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400 text-sm">No tasks assigned to you yet.</p>
          <p className="text-slate-300 text-xs mt-1">Your supervisor will assign tasks shortly.</p>
        </div>
      )}

      {jobs.map(({ vehicle, tasks: jobTasks }) => {
        const activeQR = vehicle.qr_codes?.find(q => q.is_active)
        return (
          <div key={vehicle.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Job header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
                </p>
                <p className="text-xs text-slate-400">{vehicle.job_id} · {vehicle.build_type}</p>
              </div>
              {activeQR && (
                <a
                  href={`/job/${activeQR.token}`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Open job →
                </a>
              )}
            </div>

            {/* Task list */}
            <div className="divide-y divide-slate-50">
              {jobTasks.map(task => (
                <div key={task.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    task.status === 'in_progress' ? 'bg-blue-400' : 'bg-slate-200'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{task.task_name}</p>
                    <p className="text-xs text-slate-400">{task.task_category}</p>
                  </div>
                  {task.photo_required && (
                    <span className="text-xs text-amber-600 shrink-0">📷</span>
                  )}
                </div>
              ))}
            </div>

            {/* Notes */}
            <JobNoteForm
              vehicleId={vehicle.id}
              existingNotes={notesByVehicle[vehicle.id] ?? []}
            />
          </div>
        )
      })}
    </div>
  )
}
