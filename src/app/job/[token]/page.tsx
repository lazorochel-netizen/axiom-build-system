import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { completeTask, uncompleteTask } from '@/actions/tasks'
import { fitterCheckIn, fitterCheckOut, getCheckedInFitter } from '@/actions/fitter-checkin'
import type { TaskStatus } from '@/types/database'
import FitterTaskCard from '@/components/FitterTaskCard'

export default async function FitterJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { token } = await params
  const { error }  = await searchParams
  const supabase   = createAdminClient()

  const { data: qr } = await (supabase.from('qr_codes') as any)
    .select('vehicle_id, is_active')
    .eq('token', token)
    .single() as { data: { vehicle_id: string; is_active: boolean } | null }

  if (!qr || !qr.is_active) notFound()

  const [{ data: vehicle }, { data: jobFitters }] = await Promise.all([
    (supabase.from('vehicles') as any)
      .select(`
        job_id, vehicle_make, vehicle_model, vehicle_year,
        build_status, build_type, notes,
        tasks ( id, task_name, task_category, task_order, status, photo_required, notes )
      `)
      .eq('id', qr!.vehicle_id)
      .single() as Promise<{ data: { job_id: string; vehicle_make: string; vehicle_model: string; vehicle_year: number | null; build_status: string; build_type: string; notes: string | null; tasks: any[] } | null }>,
    (supabase.from('job_fitters') as any)
      .select('user_id, users(id, name, pin)')
      .eq('vehicle_id', qr!.vehicle_id) as Promise<{ data: { user_id: string; users: any }[] | null }>,
  ])

  if (!vehicle) notFound()

  // Check if a fitter is already checked in via cookie
  const checkedIn = await getCheckedInFitter()

  const tasks = (vehicle.tasks ?? []).sort(
    (a: { task_order: number }, b: { task_order: number }) => a.task_order - b.task_order
  )
  const done    = tasks.filter((t: { status: TaskStatus }) => t.status === 'completed').length
  const total   = tasks.length
  const allDone = total > 0 && done === total

  // Assigned fitters with PINs set
  const assignedFitters = (jobFitters ?? [])
    .map((jf: any) => jf.users)
    .filter((u: any) => u && u.pin)

  // ── CHECK-IN SCREEN ───────────────────────────────────────────────────────
  if (!checkedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-4">
          <h1 className="text-base font-semibold text-slate-900">
            {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{vehicle.job_id} · {vehicle.build_type}</p>
        </div>

        <div className="flex-1 flex items-start justify-center px-4 py-10">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <p className="text-2xl mb-1">🔐</p>
              <h2 className="text-lg font-semibold text-slate-900">Who are you?</h2>
              <p className="text-sm text-slate-500 mt-1">Select your name and enter your PIN to begin</p>
            </div>

            {error === 'wrong_pin' && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 text-center">
                Incorrect PIN — please try again
              </div>
            )}
            {error === 'missing' && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 text-center">
                Please select your name and enter your PIN
              </div>
            )}

            {assignedFitters.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 text-sm text-amber-800 text-center">
                No fitters with PINs are assigned to this job yet. Ask your supervisor to assign you and set your PIN in the staff page.
              </div>
            ) : (
              <form action={fitterCheckIn} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <input type="hidden" name="token" value={token} />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Your Name</label>
                  <div className="space-y-2">
                    {assignedFitters.map((f: any) => (
                      <label key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-[#F3EEF9] cursor-pointer transition-colors">
                        <input type="radio" name="fitter_id" value={f.id} required className="accent-blue-600" />
                        <span className="text-sm font-medium text-slate-900">{f.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Your PIN</label>
                  <input
                    type="password"
                    name="pin"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    placeholder="• • • •"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#5B2D8E] hover:bg-[#4A2478] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  Check In →
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── JOB PAGE (checked in) ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">{vehicle.job_id} · {vehicle.build_type}</p>
          </div>
          {/* Fitter identity + switch */}
          <div className="text-right">
            <p className="text-xs font-medium text-slate-700">{checkedIn.name}</p>
            <form action={fitterCheckOut}>
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="text-xs text-blue-500 hover:underline">Switch</button>
            </form>
          </div>
        </div>
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
              className="h-full bg-[#F3EEF9]0 rounded-full transition-all duration-500"
              style={{ width: total ? `${(done / total) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Ops notes */}
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
