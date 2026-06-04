import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { addTask } from '@/actions/tasks'
import { saveJobNotes } from '@/actions/jobs'
import { togglePhotoVisibility } from '@/actions/photos'
import { assignFitterToJob, removeFitterFromJob } from '@/actions/job-fitters'
import BuildStatusSelect from '@/components/BuildStatusSelect'
import type { TaskStatus } from '@/types/database'
import TaskRow from '@/components/TaskRow'
import DeleteJobButton from '@/components/DeleteJobButton'

const TASK_STATUS_COLOURS: Record<string, string> = {
  pending:         'bg-slate-100 text-slate-600',
  in_progress:     'bg-blue-100 text-blue-700',
  waiting_for_kit: 'bg-amber-100 text-amber-700',
  completed:       'bg-green-100 text-green-700',
}

const TASK_CATEGORIES = [
  'Electrical',
  'Plumbing / Water',
  'Fit-out / Joinery',
  'Compliance',
  'Quality Check',
  'Other',
]

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select(`
      *,
      customers ( name, email, phone ),
      tasks ( * ),
      qr_codes ( token, is_active ),
      photos ( id, image_url, is_customer_visible, uploaded_at )
    `)
    .eq('id', id)
    .single()

  if (!vehicle) notFound()

  // Fetch fitters for task assignment
  const { data: fitters } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'fitter')

  // Fetch assigned fitters for this job
  const { data: jobFitters } = await supabase
    .from('job_fitters')
    .select('user_id, users(id, name)')
    .eq('vehicle_id', id)

  const tasks = (vehicle.tasks ?? []).sort(
    (a: { task_order: number }, b: { task_order: number }) => a.task_order - b.task_order
  )
  const totalTasks = tasks.length
  const doneTasks  = tasks.filter((t: { status: TaskStatus }) => t.status === 'completed').length

  const activeQR = (vehicle.qr_codes as { token: string; is_active: boolean }[])
    ?.find(q => q.is_active)

  const customer = vehicle.customers as { name: string; email: string; phone: string } | null

  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">{vehicle.job_id} · {vehicle.build_type}</p>
        </div>
        <div className="flex gap-2 items-center">
          {activeQR && (
            <a
              href={`/ops/jobs/${id}/print-qr`}
              target="_blank"
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            >
              Print QR
            </a>
          )}
          <BuildStatusSelect vehicleId={id} currentStatus={vehicle.build_status} />
          <DeleteJobButton vehicleId={id} />
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {([
          ['Customer',       customer?.name ?? '—'],
          ['Email',          customer?.email ?? '—'],
          ['Phone',          customer?.phone ?? '—'],
          ['VIN',            vehicle.vin ?? '—'],
          ['Stock No.',      vehicle.stock_number ?? '—'],
          ['Registration',   vehicle.registration ?? '—'],
          ['Est. Completion',vehicle.estimated_completion_date ?? '—'],
        ] as [string, string][]).map(([label, value]) => (
          <div key={label} className="flex px-4 py-3 text-sm">
            <span className="w-36 text-slate-500 shrink-0">{label}</span>
            <span className="text-slate-900">{value}</span>
          </div>
        ))}
      </div>

      {/* Assigned Fitters */}
      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Assigned Fitters</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {jobFitters && jobFitters.length > 0 ? jobFitters.map((jf: any) => (
            <div key={jf.user_id} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5">
              <span className="text-sm text-blue-800 font-medium">{jf.users?.name}</span>
              <form action={removeFitterFromJob}>
                <input type="hidden" name="vehicle_id" value={id} />
                <input type="hidden" name="user_id" value={jf.user_id} />
                <button type="submit" className="text-blue-400 hover:text-red-500 text-xs font-bold transition-colors">✕</button>
              </form>
            </div>
          )) : (
            <p className="text-sm text-slate-400">No fitters assigned yet.</p>
          )}
        </div>
        {fitters && fitters.filter(f => !jobFitters?.find((jf: any) => jf.user_id === f.id)).length > 0 && (
          <form action={assignFitterToJob} className="flex items-center gap-2">
            <input type="hidden" name="vehicle_id" value={id} />
            <select name="user_id" className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select fitter to add…</option>
              {fitters.filter(f => !jobFitters?.find((jf: any) => jf.user_id === f.id)).map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Assign
            </button>
          </form>
        )}
      </section>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-slate-700">Task Progress</span>
          <span className="text-slate-400">{doneTasks}/{totalTasks}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: totalTasks ? `${(doneTasks / totalTasks) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Task List */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400 mb-4">No tasks added yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 mb-4">
            {tasks.map((task: { id: string; task_name: string; task_category: string; status: TaskStatus; assigned_to: string | null }) => (
              <TaskRow
                key={task.id}
                task={task}
                vehicleId={id}
                fitters={fitters ?? []}
              />
            ))}
          </div>
        )}

        {/* Add Task Form */}
        <details className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50 select-none">
            + Add Task
          </summary>
          <form action={addTask} className="px-4 pb-4 pt-2 space-y-3 border-t border-slate-100">
            <input type="hidden" name="vehicle_id" value={id} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Task Name *</label>
                <input
                  name="task_name"
                  required
                  placeholder="e.g. Install 12V lighting"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category *</label>
                <select
                  name="task_category"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TASK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Assign to Fitter</label>
                <select
                  name="assigned_to"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {(fitters ?? []).map((f: { id: string; name: string }) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Order</label>
                <input
                  type="number"
                  name="task_order"
                  defaultValue={totalTasks + 1}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" name="photo_required" className="rounded" />
              Photo required for this task
            </label>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Add Task
            </button>
          </form>
        </details>
      </section>

      {/* Additional Task Notes */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Additional Task Notes</h2>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <form action={saveJobNotes} className="space-y-3">
            <input type="hidden" name="vehicle_id" value={id} />
            <textarea
              name="notes"
              defaultValue={vehicle.notes ?? ''}
              rows={4}
              placeholder="Add notes for the fitter — e.g. customer requests, special upgrades, changes to the build..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Save Notes
            </button>
          </form>
        </div>
      </section>

      {/* Photos */}
      {vehicle.photos && vehicle.photos.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Fitter Photos</h2>
          <div className="grid grid-cols-2 gap-3">
            {(vehicle.photos as { id: string; image_url: string; is_customer_visible: boolean; uploaded_at: string }[]).map(photo => (
              <div key={photo.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.image_url} alt="Build photo" className="w-full aspect-video object-cover" />
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${photo.is_customer_visible ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {photo.is_customer_visible ? 'Visible to customer' : 'Hidden'}
                  </span>
                  <form action={togglePhotoVisibility}>
                    <input type="hidden" name="photo_id" value={photo.id} />
                    <input type="hidden" name="vehicle_id" value={id} />
                    <input type="hidden" name="visible" value={String(photo.is_customer_visible)} />
                    <button type="submit" className="text-xs text-blue-600 hover:underline">
                      {photo.is_customer_visible ? 'Hide' : 'Show to customer'}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* QR Code */}
      {activeQR && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">QR Code</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/qr/${activeQR.token}`}
              alt="Job QR Code"
              width={80}
              height={80}
              className="rounded-lg"
            />
            <div className="text-sm">
              <p className="text-slate-500 mb-1">Fitter scan link:</p>
              <a
                href={`/job/${activeQR.token}`}
                className="text-blue-600 underline break-all text-xs"
                target="_blank"
                rel="noopener noreferrer"
              >
                /job/{activeQR.token}
              </a>
              <div className="mt-2">
                <a
                  href={`/ops/jobs/${id}/print-qr`}
                  target="_blank"
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Open printable QR →
                </a>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
