import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BuildStatus } from '@/types/database'

/**
 * Customer portal — public, no login required.
 * Uses admin client so RLS doesn't block unauthenticated reads.
 */

const STAGE_LABELS: Record<BuildStatus, string> = {
  pending:               'Build Pending',
  kit_designing:         'Your Build is Being Designed',
  kit_production:        'Conversion Kit in Production',
  kit_dispatched:        'Kit On Its Way',
  in_progress:           'Build In Progress',
  waiting_on_parts:      'Waiting on Parts',
  waiting_on_compliance: 'In Compliance Review',
  completed:             'Build Complete — Ready for Handover',
  delivered:             'Delivered',
}

const STAGE_DESCRIPTIONS: Record<BuildStatus, string> = {
  pending:               'Your vehicle has been received and your build is being prepared.',
  kit_designing:         'Our team is designing your custom conversion kit. We\'ll keep you updated as it progresses.',
  kit_production:        'Your conversion kit is currently being manufactured. We\'ll notify you when it\'s on its way.',
  kit_dispatched:        'Your conversion kit has been dispatched and is on its way to our workshop. Fitting will begin shortly.',
  in_progress:           'Your build is underway. We\'ll keep this page updated as work progresses.',
  waiting_on_parts:      'We\'re waiting on parts to arrive before continuing your build.',
  waiting_on_compliance: 'Your vehicle is going through its compliance checks.',
  completed:             'Great news — your build is complete. Our team will be in touch to arrange handover.',
  delivered:             'Your vehicle has been delivered. Thank you for choosing Axiom Group.',
}

export default async function CustomerPortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createAdminClient()

  // Resolve token → customer → vehicle
  const { data: customer } = await (supabase.from('customers') as any)
    .select('id, name')
    .eq('portal_token', token)
    .single() as { data: { id: string; name: string } | null }

  if (!customer) notFound()

  const { data: vehicles } = await (supabase.from('vehicles') as any)
    .select(`
      id, job_id, vehicle_make, vehicle_model, vehicle_year,
      build_status, estimated_completion_date,
      photos ( id, image_url, is_customer_visible, uploaded_at ),
      tasks ( id, task_name, task_category, task_order, status )
    `)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false }) as { data: any[] | null }

  if (!vehicles || vehicles.length === 0) notFound()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <p className="text-xs text-slate-400 uppercase tracking-wide">Axiom Group Australia</p>
        <h1 className="text-lg font-semibold text-slate-900 mt-0.5">Your Build Progress</h1>
        <p className="text-sm text-slate-500 mt-0.5">Hi {customer.name}</p>
      </div>

      <div className="px-4 py-6 space-y-8 max-w-lg mx-auto">
        {vehicles.map(vehicle => {
          const status = vehicle.build_status as BuildStatus
          const approvedPhotos = (vehicle.photos ?? []).filter(
            (p: { is_customer_visible?: boolean }) => p.is_customer_visible
          )

          return (
            <div key={vehicle.id} className="space-y-4">
              {vehicles.length > 1 && (
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Job {vehicle.job_id}
                </h2>
              )}

              {/* Vehicle */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-400 mb-1">Vehicle</p>
                <p className="text-base font-semibold text-slate-900">
                  {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Job {vehicle.job_id}</p>
              </div>

              {/* Status */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-400 mb-2">Current Status</p>
                <span className="inline-block bg-blue-100 text-[#4A2478] text-sm font-medium px-3 py-1.5 rounded-full">
                  {STAGE_LABELS[status]}
                </span>
                <p className="text-sm text-slate-600 mt-3">{STAGE_DESCRIPTIONS[status]}</p>
                {vehicle.estimated_completion_date && (
                  <p className="text-xs text-slate-400 mt-3">
                    Estimated completion:{' '}
                    <span className="text-slate-700 font-medium">
                      {new Date(vehicle.estimated_completion_date).toLocaleDateString('en-AU', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </span>
                  </p>
                )}
              </div>

              {/* Build Progress — task checklist */}
              {(() => {
                const tasks = ((vehicle.tasks ?? []) as { id: string; task_name: string; task_category: string; task_order: number; status: string }[])
                  .sort((a, b) => a.task_order - b.task_order)
                if (tasks.length === 0) return null
                const done  = tasks.filter(t => t.status === 'completed').length
                const total = tasks.length
                const byCategory = tasks.reduce((acc, t) => {
                  if (!acc[t.task_category]) acc[t.task_category] = []
                  acc[t.task_category].push(t)
                  return acc
                }, {} as Record<string, typeof tasks>)

                return (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-900">Build progress</p>
                        <p className="text-xs text-slate-400">{done} / {total} tasks</p>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#F3EEF9]0 rounded-full transition-all" style={{ width: `${Math.round((done / total) * 100)}%` }} />
                      </div>
                    </div>

                    {Object.entries(byCategory).map(([category, categoryTasks], ci, arr) => (
                      <div key={category} className={ci < arr.length - 1 ? 'border-b border-slate-100' : ''}>
                        <p className="px-4 pt-3 pb-1 text-xs font-medium text-slate-400 uppercase tracking-wide">{category}</p>
                        <div className="px-4 pb-3 space-y-2">
                          {categoryTasks.map((task: { id: string; task_name: string; status: string }) => {
                            const isDone   = task.status === 'completed'
                            const isActive = task.status === 'in_progress'
                            return (
                              <div key={task.id} className="flex items-center gap-3">
                                {isDone ? (
                                  <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                    <svg className="w-2.5 h-2.5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                ) : isActive ? (
                                  <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#5B2D8E]" />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-slate-200 bg-slate-50 shrink-0" />
                                )}
                                <p className={`text-sm ${isDone ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                  {task.task_name}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}

                    <div className="px-4 py-2.5 border-t border-slate-100 flex gap-4">
                      {[
                        { colour: 'bg-green-100 border-green-300', label: 'Done' },
                        { colour: 'bg-blue-100 border-blue-300', label: 'In progress' },
                        { colour: 'bg-slate-50 border-slate-200', label: 'Upcoming' },
                      ].map(({ colour, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <div className={`w-2.5 h-2.5 rounded-full border ${colour}`} />
                          <span className="text-xs text-slate-400">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Approved Photos */}
              {approvedPhotos.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Build Photos</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {approvedPhotos.map((photo: { id: string; image_url: string; uploaded_at: string }) => (
                      <div key={photo.id} className="rounded-xl overflow-hidden bg-slate-200 aspect-video">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.image_url} alt="Build progress" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {vehicles.length > 1 && <hr className="border-slate-200" />}
            </div>
          )
        })}

        <p className="text-xs text-center text-slate-400 pb-4">
          Questions? Contact Axiom Group on{' '}
          <a href={`tel:${process.env.NEXT_PUBLIC_WORKSHOP_PHONE ?? ''}`} className="underline">
            {process.env.NEXT_PUBLIC_WORKSHOP_PHONE ?? 'our workshop number'}
          </a>.
        </p>
      </div>
    </div>
  )
}
