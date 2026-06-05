import { createClient } from '@/lib/supabase/server'
import { updateKitStatus } from '@/actions/kit-orders'
import type { BuildStatus, KitStatus } from '@/types/database'

const KIT_STAGE_COLOURS: Record<string, string> = {
  pending:        'bg-slate-100 text-slate-600',
  kit_designing:  'bg-orange-100 text-orange-700',
  kit_production: 'bg-orange-100 text-orange-700',
  kit_dispatched: 'bg-yellow-100 text-yellow-700',
}

const KIT_STAGE_LABELS: Record<string, string> = {
  pending:        'Not Started',
  kit_designing:  'Designing',
  kit_production: 'In Production',
  kit_dispatched: 'Dispatched',
}

// Manufacturer sees jobs that are in pre-build / kit stages
const BUILD_STATUS_ACTIVE: BuildStatus[] = [
  'pending', 'kit_designing', 'kit_production', 'kit_dispatched', 'waiting_on_parts'
]

export default async function ManufacturerDashboard() {
  const supabase = await createClient()

  // Fetch all active jobs + their kit orders
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(`
      id, job_id, vehicle_make, vehicle_model, vehicle_year,
      build_type, build_status, estimated_completion_date, notes,
      kit_orders ( id, status, manufacturer_notes, updated_at )
    `)
    .in('build_status', BUILD_STATUS_ACTIVE)
    .order('created_at', { ascending: false })

  const active = vehicles ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Kit Orders</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Update the kit manufacture status for each job. Ops are notified automatically.
        </p>
      </div>

      {active.length === 0 ? (
        <p className="text-sm text-slate-400 py-12 text-center">No active jobs at the moment.</p>
      ) : (
        <div className="space-y-4">
          {active.map(v => {
            const kit = (v.kit_orders as any)?.[0] ?? null
            const currentStatus = v.build_status
            const isOverdue = v.estimated_completion_date &&
              new Date(v.estimated_completion_date) < new Date()

            return (
              <div key={v.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Job header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {v.vehicle_year} {v.vehicle_make} {v.vehicle_model}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{v.job_id} · {v.build_type}</p>
                    {v.estimated_completion_date && (
                      <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                        {isOverdue ? '⚠ Overdue · ' : 'Target: '}
                        {new Date(v.estimated_completion_date).toLocaleDateString('en-AU', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${KIT_STAGE_COLOURS[currentStatus] ?? 'bg-slate-100 text-slate-500'}`}>
                    {KIT_STAGE_LABELS[currentStatus] ?? currentStatus.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Ops notes (build customisation info) */}
                {v.notes && (
                  <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Build Notes from Axiom Ops</p>
                    <p className="text-sm text-amber-900 whitespace-pre-line">{v.notes}</p>
                  </div>
                )}

                {/* Kit status update form */}
                <form action={updateKitStatus} className="px-5 py-4 space-y-3">
                  <input type="hidden" name="vehicle_id" value={v.id} />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Kit Status</label>
                      <select
                        name="status"
                        defaultValue={currentStatus === 'pending' ? 'designing' : currentStatus.replace('kit_', '')}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="designing">Designing</option>
                        <option value="production">In Production</option>
                        <option value="completed">Kit Completed</option>
                        <option value="dispatched">Dispatched</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        Update Status
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Notes to Axiom <span className="text-slate-400 font-normal">(optional — e.g. customisations, lead time, delays)</span>
                    </label>
                    <textarea
                      name="manufacturer_notes"
                      defaultValue={kit?.manufacturer_notes ?? ''}
                      rows={2}
                      placeholder="e.g. Custom solar bracket welded as requested. Dispatching Monday."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {kit?.updated_at && (
                    <p className="text-xs text-slate-400">
                      Last updated {new Date(kit.updated_at).toLocaleDateString('en-AU', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  )}
                </form>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
