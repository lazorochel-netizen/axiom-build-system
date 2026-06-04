import { createClient } from '@/lib/supabase/server'
import JobNoteForm from '@/components/JobNoteForm'

export default async function FitterDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch jobs assigned to this fitter via job_fitters table
  const { data: jobFitters } = await supabase
    .from('job_fitters')
    .select(`
      vehicle_id,
      vehicles (
        id, job_id, vehicle_make, vehicle_model, vehicle_year,
        build_type, build_status, notes,
        tasks ( id, task_name, task_category, status, photo_required, task_order ),
        qr_codes ( token, is_active )
      )
    `)
    .eq('user_id', user!.id)

  // Also fetch jobs where individual tasks are assigned to this fitter (backwards compat)
  const { data: taskAssigned } = await supabase
    .from('tasks')
    .select(`
      id, task_name, task_category, status, photo_required, task_order,
      vehicles ( id, job_id, vehicle_make, vehicle_model, vehicle_year, build_type, build_status, notes,
        tasks ( id, task_name, task_category, status, photo_required, task_order ),
        qr_codes ( token, is_active )
      )
    `)
    .eq('assigned_to', user!.id)
    .neq('status', 'completed')

  // Merge both sources into a map by vehicle id
  const jobMap = new Map<string, any>()

  for (const jf of jobFitters ?? []) {
    const v = jf.vehicles as any
    if (!v) continue
    if (!jobMap.has(v.id)) jobMap.set(v.id, v)
  }

  for (const task of taskAssigned ?? []) {
    const v = task.vehicles as any
    if (!v || jobMap.has(v.id)) continue
    jobMap.set(v.id, v)
  }

  const vehicles = Array.from(jobMap.values())

  // Fetch notes
  const vehicleIds = vehicles.map(v => v.id)
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

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-slate-900">My Jobs</h1>

      {vehicles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400 text-sm">No jobs assigned to you yet.</p>
          <p className="text-slate-300 text-xs mt-1">Your supervisor will assign jobs shortly.</p>
        </div>
      )}

      {vehicles.map((vehicle: any) => {
        const activeQR = vehicle.qr_codes?.find((q: any) => q.is_active)
        const tasks = (vehicle.tasks ?? []).sort((a: any, b: any) => a.task_order - b.task_order)

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
              {tasks.map((task: any) => (
                <div key={task.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    task.status === 'completed'    ? 'bg-green-400' :
                    task.status === 'in_progress'  ? 'bg-blue-400'  :
                    task.status === 'waiting_for_kit' ? 'bg-amber-400' :
                    'bg-slate-200'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {task.task_name}
                    </p>
                    <p className="text-xs text-slate-400">{task.task_category}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    task.status === 'completed'       ? 'bg-green-100 text-green-700' :
                    task.status === 'in_progress'     ? 'bg-blue-100 text-blue-700'   :
                    task.status === 'waiting_for_kit' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {task.status.replace(/_/g, ' ')}
                  </span>
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
