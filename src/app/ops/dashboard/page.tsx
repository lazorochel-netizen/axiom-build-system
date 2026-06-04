import { createClient } from '@/lib/supabase/server'
import type { BuildStatus } from '@/types/database'

const DONE_PAGE_SIZE = 10

const STATUS_LABELS: Record<BuildStatus, string> = {
  pending:                'Pending',
  in_progress:            'In Progress',
  waiting_on_parts:       'Waiting for Kit',
  waiting_on_compliance:  'In Compliance',
  completed:              'Completed',
  delivered:              'Delivered',
}

// All statuses shown as summary tiles on the dashboard
const DASHBOARD_STATUSES: BuildStatus[] = [
  'pending', 'in_progress', 'waiting_on_parts', 'waiting_on_compliance', 'completed', 'delivered'
]

const STATUS_COLOURS: Record<BuildStatus, string> = {
  pending:                'bg-slate-100 text-slate-600',
  in_progress:            'bg-blue-100 text-blue-700',
  waiting_on_parts:       'bg-amber-100 text-amber-700',
  waiting_on_compliance:  'bg-purple-100 text-purple-700',
  completed:              'bg-green-100 text-green-700',
  delivered:              'bg-slate-200 text-slate-500',
}

export default async function OpsDashboard({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const donePage = Math.max(0, parseInt(page ?? '0', 10))
  const supabase = await createClient()

  // Active jobs — no limit, all statuses except completed/delivered
  const [{ data: active }, { data: done, count: doneCount }] = await Promise.all([
    supabase
      .from('vehicles')
      .select('id, job_id, vehicle_make, vehicle_model, vehicle_year, build_status, build_type, estimated_completion_date')
      .not('build_status', 'in', '("completed","delivered")')
      .order('created_at', { ascending: false }),
    supabase
      .from('vehicles')
      .select('id, job_id, vehicle_make, vehicle_model, vehicle_year, build_status', { count: 'exact' })
      .in('build_status', ['completed', 'delivered'])
      .order('created_at', { ascending: false })
      .range(donePage * DONE_PAGE_SIZE, (donePage + 1) * DONE_PAGE_SIZE - 1),
  ])

  // Counts per status for summary tiles (separate lightweight query)
  const { data: allStatuses } = await supabase
    .from('vehicles')
    .select('build_status')

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
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {DASHBOARD_STATUSES.map(status => {
          const count = allStatuses?.filter(v => v.build_status === status).length ?? 0
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
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Active Jobs {active && active.length > 0 && <span className="text-slate-400 font-normal">({active.length})</span>}
        </h2>
        {!active?.length ? (
          <p className="text-sm text-slate-400">No active jobs.</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {active.map(v => {
              const isOverdue = v.estimated_completion_date &&
                new Date(v.estimated_completion_date) < new Date() &&
                !['completed', 'delivered'].includes(v.build_status)
              return (
              <a
                key={v.id}
                href={`/ops/jobs/${v.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {v.vehicle_year} {v.vehicle_make} {v.vehicle_model}
                    {isOverdue && <span className="ml-2 text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">Overdue</span>}
                  </p>
                  <p className="text-xs text-slate-400">{v.job_id} · {v.build_type}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOURS[v.build_status as BuildStatus]}`}>
                  {STATUS_LABELS[v.build_status as BuildStatus]}
                </span>
              </a>
            )})}
          </div>
        )}
      </section>

      {/* Completed & Delivered jobs — paginated */}
      {(done?.length ?? 0) > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Completed & Delivered
            </h2>
            <span className="text-xs text-slate-400">{doneCount ?? 0} total</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {done!.map(v => (
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
          {/* Pagination */}
          {(doneCount ?? 0) > DONE_PAGE_SIZE && (
            <div className="flex justify-between mt-3">
              {donePage > 0 ? (
                <a href={`?page=${donePage - 1}`} className="text-xs text-blue-600 hover:underline">← Newer</a>
              ) : <span />}
              {(donePage + 1) * DONE_PAGE_SIZE < (doneCount ?? 0) && (
                <a href={`?page=${donePage + 1}`} className="text-xs text-blue-600 hover:underline">Older →</a>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
