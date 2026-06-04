import { createClient } from '@/lib/supabase/server'
import type { BuildStatus } from '@/types/database'

const STATUS_LABELS: Record<BuildStatus, string> = {
  pending:                'Pending',
  in_progress:            'In Progress',
  waiting_on_parts:       'Waiting for the Kit',
  waiting_on_compliance:  'Waiting for the Kit',
  completed:              'Completed',
  delivered:              'Delivered',
}

// Only show these statuses on the dashboard summary
const DASHBOARD_STATUSES: BuildStatus[] = [
  'pending', 'in_progress', 'waiting_on_parts', 'completed', 'delivered'
]

const STATUS_COLOURS: Record<BuildStatus, string> = {
  pending:                'bg-slate-100 text-slate-600',
  in_progress:            'bg-blue-100 text-blue-700',
  waiting_on_parts:       'bg-amber-100 text-amber-700',
  waiting_on_compliance:  'bg-purple-100 text-purple-700',
  completed:              'bg-green-100 text-green-700',
  delivered:              'bg-slate-200 text-slate-500',
}

export default async function OpsDashboard() {
  const supabase = await createClient()

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, job_id, vehicle_make, vehicle_model, vehicle_year, build_status, build_type, estimated_completion_date')
    .order('created_at', { ascending: false })
    .limit(50)

  const active = vehicles?.filter(v => !['completed', 'delivered'].includes(v.build_status)) ?? []
  const done   = vehicles?.filter(v =>  ['completed', 'delivered'].includes(v.build_status)) ?? []

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <a
          href="/ops/jobs/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Job
        </a>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {DASHBOARD_STATUSES.map(status => {
          const count = vehicles?.filter(v =>
            status === 'waiting_on_parts'
              ? v.build_status === 'waiting_on_parts' || v.build_status === 'waiting_on_compliance'
              : v.build_status === status
          ).length ?? 0
          return (
            <div key={status} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-2xl font-bold text-slate-900">{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{STATUS_LABELS[status]}</p>
            </div>
          )
        })}
      </div>

      {/* Active jobs */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Active Jobs</h2>
        {active.length === 0 ? (
          <p className="text-sm text-slate-400">No active jobs.</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {active.map(v => (
              <a
                key={v.id}
                href={`/ops/jobs/${v.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {v.vehicle_year} {v.vehicle_make} {v.vehicle_model}
                  </p>
                  <p className="text-xs text-slate-400">{v.job_id} · {v.build_type}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOURS[v.build_status as BuildStatus]}`}>
                  {STATUS_LABELS[v.build_status as BuildStatus]}
                </span>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Completed jobs */}
      {done.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Completed & Delivered</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {done.map(v => (
              <a
                key={v.id}
                href={`/ops/jobs/${v.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {v.vehicle_year} {v.vehicle_make} {v.vehicle_model}
                  </p>
                  <p className="text-xs text-slate-400">{v.job_id}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOURS[v.build_status as BuildStatus]}`}>
                  {STATUS_LABELS[v.build_status as BuildStatus]}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
