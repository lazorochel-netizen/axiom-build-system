import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { addTask } from '@/actions/tasks'
import { saveJobNotes, updateJobDetails } from '@/actions/jobs'
import { sendCustomerUpdate } from '@/actions/customer-update'
import { togglePhotoVisibility } from '@/actions/photos'
import { assignFitterToJob, removeFitterFromJob } from '@/actions/job-fitters'
import { uploadDocument, deleteDocument } from '@/actions/documents'
import BuildStatusSelect from '@/components/BuildStatusSelect'
import type { TaskStatus } from '@/types/database'
import TaskRow from '@/components/TaskRow'
import DeleteJobButton from '@/components/DeleteJobButton'
import SubmitButton from '@/components/SubmitButton'
import PreviewEmailButton from '@/components/PreviewEmailButton'

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
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; sent?: string }>
}) {
  const { id } = await params
  const { error, sent } = await searchParams
  const supabase = await createClient()

  // Fetch vehicle + fitters list + job fitters in parallel
  const [{ data: vehicle }, { data: fitters }, { data: jobFitters }] = await Promise.all([
    supabase
      .from('vehicles')
      .select(`
        *,
        customers ( name, email, phone ),
        tasks ( * ),
        qr_codes ( token, is_active ),
        photos ( id, image_url, is_customer_visible, uploaded_at ),
        documents ( id, document_name, document_type, file_url, uploaded_at )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('users')
      .select('id, name')
      .eq('role', 'fitter'),
    supabase
      .from('job_fitters')
      .select('user_id, users(id, name)')
      .eq('vehicle_id', id),
  ])

  if (!vehicle) notFound()

  // Fetch kit order separately so a missing table never causes a 404
  const { data: kitOrderRaw } = await supabase
    .from('kit_orders' as any)
    .select('id, status, manufacturer_notes, updated_at, users(name)')
    .eq('vehicle_id', id)
    .maybeSingle()
  const kitOrder = kitOrderRaw as { id: string; status: string; manufacturer_notes: string | null; updated_at: string; users: { name: string } | null } | null

  const tasks = (vehicle.tasks ?? []).sort(
    (a: { task_order: number }, b: { task_order: number }) => a.task_order - b.task_order
  )

  // Fetch task fitters + activity log in parallel (both depend on tasks/vehicle being resolved)
  const taskIds = tasks.map((t: any) => t.id)
  const [{ data: taskFitters }, { data: activityLog }] = await Promise.all([
    taskIds.length > 0
      ? supabase
          .from('task_fitters')
          .select('task_id, user_id, users(id, name)')
          .in('task_id', taskIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from('activity_log')
      .select('id, action, new_value, created_at, users(name)')
      .eq('vehicle_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const taskFittersMap = (taskFitters ?? []).reduce((acc: any, tf: any) => {
    if (!acc[tf.task_id]) acc[tf.task_id] = []
    acc[tf.task_id].push({ id: tf.user_id, name: tf.users?.name })
    return acc
  }, {} as Record<string, { id: string; name: string }[]>)

  const totalTasks = tasks.length
  const doneTasks  = tasks.filter((t: { status: TaskStatus }) => t.status === 'completed').length

  const activeQR = (vehicle.qr_codes as { token: string; is_active: boolean }[])
    ?.find(q => q.is_active)

  const customer = vehicle.customers as { name: string; email: string; phone: string } | null

  return (
    <div className="max-w-3xl space-y-6">

      {error && (
        <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠ {error}
        </div>
      )}
      {sent && (
        <div className="px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✓ Email sent to customer successfully.
        </div>
      )}

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

      {/* Details — editable */}
      <details className="bg-white rounded-xl border border-slate-200 overflow-hidden" open>
        <summary className="px-4 py-3.5 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50 select-none flex items-center justify-between">
          <span>Job Details</span>
          <span className="text-xs text-slate-400">Click to collapse</span>
        </summary>
        <form action={updateJobDetails} className="border-t border-slate-100 divide-y divide-slate-100">
          <input type="hidden" name="vehicle_id" value={id} />
          <input type="hidden" name="customer_id" value={customer ? (vehicle.customer_id ?? '') : ''} />

          {/* Customer */}
          <div className="px-4 py-3 grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm text-slate-500">Customer</label>
            <input name="customer_name" defaultValue={customer?.name ?? ''} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
          </div>
          <div className="px-4 py-3 grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm text-slate-500">Email</label>
            <input name="customer_email" type="email" defaultValue={customer?.email ?? ''} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
          </div>
          <div className="px-4 py-3 grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm text-slate-500">Phone</label>
            <input name="customer_phone" defaultValue={customer?.phone ?? ''} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
          </div>

          {/* Vehicle */}
          <div className="px-4 py-3 grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm text-slate-500">Make</label>
            <input name="vehicle_make" defaultValue={vehicle.vehicle_make} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
          </div>
          <div className="px-4 py-3 grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm text-slate-500">Model</label>
            <input name="vehicle_model" defaultValue={vehicle.vehicle_model} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
          </div>
          <div className="px-4 py-3 grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm text-slate-500">Year</label>
            <input name="vehicle_year" type="number" defaultValue={vehicle.vehicle_year ?? ''} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
          </div>
          <div className="px-4 py-3 grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm text-slate-500">VIN</label>
            <input name="vin" defaultValue={vehicle.vin ?? ''} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
          </div>
          <div className="px-4 py-3 grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm text-slate-500">Stock No.</label>
            <input name="stock_number" defaultValue={vehicle.stock_number ?? ''} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
          </div>
          <div className="px-4 py-3 grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm text-slate-500">Registration</label>
            <input name="registration" defaultValue={vehicle.registration ?? ''} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
          </div>
          <div className="px-4 py-3 grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm text-slate-500">Build Type</label>
            <input name="build_type" defaultValue={vehicle.build_type} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
          </div>
          <div className="px-4 py-3 grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm text-slate-500">Est. Completion</label>
            <input name="estimated_completion_date" type="date" defaultValue={vehicle.estimated_completion_date ?? ''} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
          </div>

          <div className="px-4 py-3">
            <SubmitButton label="Save Details" pendingLabel="Saving…" />
          </div>
        </form>
      </details>

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
            <SubmitButton label="Assign" pendingLabel="Assigning…" />
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
            {tasks.map((task: { id: string; task_name: string; task_category: string; status: TaskStatus; assigned_to: string | null; due_date: string | null }) => (
              <TaskRow
                key={task.id}
                task={task}
                vehicleId={id}
                fitters={fitters ?? []}
                assignedFitters={taskFittersMap[task.id] ?? []}
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

            <div className="grid grid-cols-3 gap-3">
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
                <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
                <input
                  type="date"
                  name="due_date"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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

            <SubmitButton label="Add Task" pendingLabel="Adding…" />
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
            <SubmitButton label="Save Notes" pendingLabel="Saving…" />
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

      {/* Kit Status */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Kit Status</h2>
        {(() => {
          const KIT_COLOURS: Record<string, string> = {
            designing:  'bg-slate-100 text-slate-600',
            production: 'bg-blue-100 text-blue-700',
            completed:  'bg-green-100 text-green-700',
            dispatched: 'bg-purple-100 text-purple-700',
          }
          const KIT_LABELS: Record<string, string> = {
            designing:  'Designing',
            production: 'In Production',
            completed:  'Kit Completed',
            dispatched: 'Dispatched',
          }
          return (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${KIT_COLOURS[kitOrder?.status ?? 'designing']}`}>
                  {KIT_LABELS[kitOrder?.status ?? 'designing']}
                </span>
                {kitOrder?.updated_at && (
                  <p className="text-xs text-slate-400">
                    Updated {new Date(kitOrder.updated_at).toLocaleDateString('en-AU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                    {kitOrder.users?.name ? ` by ${kitOrder.users.name}` : ''}
                  </p>
                )}
              </div>
              {kitOrder?.manufacturer_notes && (
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Manufacturer Notes</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{kitOrder.manufacturer_notes}</p>
                </div>
              )}
              {!kitOrder && (
                <p className="text-xs text-slate-400">No kit status update yet from the manufacturer.</p>
              )}
            </div>
          )
        })()}
      </section>

      {/* Documents */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Documents</h2>

        {/* Existing docs */}
        {vehicle.documents && vehicle.documents.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 mb-3">
            {(vehicle.documents as { id: string; document_name: string; document_type: string; file_url: string; uploaded_at: string }[]).map(doc => (
              <div key={doc.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:underline truncate block">
                    {doc.document_name}
                  </a>
                  <p className="text-xs text-slate-400 mt-0.5">{doc.document_type} · {new Date(doc.uploaded_at).toLocaleDateString('en-AU')}</p>
                </div>
                <form action={deleteDocument}>
                  <input type="hidden" name="document_id" value={doc.id} />
                  <input type="hidden" name="vehicle_id" value={id} />
                  <button type="submit" className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                </form>
              </div>
            ))}
          </div>
        )}

        {/* Upload form */}
        <details className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50 select-none">
            + Upload Document
          </summary>
          <form action={uploadDocument} encType="multipart/form-data" className="px-4 pb-4 pt-2 space-y-3 border-t border-slate-100">
            <input type="hidden" name="vehicle_id" value={id} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Document Name</label>
                <input name="document_name" placeholder="e.g. Compliance Certificate"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                <select name="document_type"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Compliance Certificate">Compliance Certificate</option>
                  <option value="Inspection Report">Inspection Report</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Warranty">Warranty</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">File *</label>
              <input type="file" name="document" required accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
            <SubmitButton label="Upload" pendingLabel="Uploading…" />
          </form>
        </details>
      </section>

      {/* Send Update to Customer */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Send Update to Customer</h2>
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          {customer?.email ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Sending to:</span>
                <span className="font-medium text-slate-900">{customer.name}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600">{customer.email}</span>
              </div>

              <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-sm">
                <span className="text-slate-500">Current status: </span>
                <span className={`font-medium px-2 py-0.5 rounded-full text-xs ml-1 ${
                  vehicle.build_status === 'completed' || vehicle.build_status === 'delivered'
                    ? 'bg-green-100 text-green-700'
                    : vehicle.build_status.startsWith('kit_')
                    ? 'bg-orange-100 text-orange-700'
                    : vehicle.build_status === 'in_progress'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {vehicle.build_status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </span>
              </div>

              <form action={sendCustomerUpdate} className="space-y-3" id="customer-update-form">
                <input type="hidden" name="vehicle_id" value={id} />
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Custom Message <span className="text-slate-400 font-normal">(optional — adds a personal note to the email)</span>
                  </label>
                  <textarea
                    id="custom-message-input"
                    name="custom_message"
                    rows={3}
                    placeholder="e.g. Your conversion kit arrived this morning and our team is ready to begin fitting next week. We'll send another update when work starts."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <SubmitButton
                    label="Send Update to Customer"
                    pendingLabel="Sending…"
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  />
                  <PreviewEmailButton previewBaseUrl={`/ops/jobs/${id}/email-preview`} />
                </div>
              </form>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              No email address on file for this customer. Add one in the Job Details section above.
            </p>
          )}
        </div>
      </section>

      {/* Activity Log */}
      {activityLog && activityLog.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Activity</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {activityLog.map((entry: any) => {
              const actionLabel: Record<string, string> = {
                job_created:    'Job created',
                status_changed: `Status → ${(entry.new_value?.status as string ?? '').replace(/_/g, ' ')}`,
                task_completed: 'Task completed',
                notes_saved:    'Notes updated',
              }
              const label = actionLabel[entry.action] ?? entry.action.replace(/_/g, ' ')
              const who = entry.users?.name ?? 'System'
              const when = new Date(entry.created_at).toLocaleDateString('en-AU', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              })
              return (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                  <p className="text-sm text-slate-700 flex-1">{label}</p>
                  <p className="text-xs text-slate-400 shrink-0">{who} · {when}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
