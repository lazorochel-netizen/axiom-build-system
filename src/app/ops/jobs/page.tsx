import { createClient } from '@/lib/supabase/server'
import type { BuildStatus } from '@/types/database'

const STATUS_COLOURS: Record<BuildStatus, string> = {
  pending:                'bg-slate-100 text-slate-600',
  in_progress:            'bg-blue-100 text-blue-700',
  waiting_on_parts:       'bg-amber-100 text-amber-700',
  waiting_on_compliance:  'bg-amber-100 text-amber-700',
  completed:              'bg-green-100 text-green-700',
  delivered:              'bg-slate-200 text-slate-500',
}

const STATUS_LABELS: Record<BuildStatus, string> = {
  pending:                'Pending',
  in_progress:            'In Progress',
  waiting_on_parts:       'Waiting for the Kit',
  waiting_on_compliance:  'Waiting for the Kit',
  completed:              'Completed',
  delivered:              'Delivered',
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('vehicles')
    .select(`
      id, job_id, vehicle_make, vehicle_model, vehicle_year,
      build_type, build_status, estimated_completion_date,
      customers ( name )
    `)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('build_status', status as BuildStatus)
  }

  if (q) {
    query = query.or(
      `job_id.ilike.%${q}%,vehicle_make.ilike.%${q}%,vehicle_model.ilike.%${q}%`
    )
  }

  const { data: vehicles } = await query
  const filtered = vehicles ?? []

  const statuses: { value: string; label: string }[] = [
    { value: 'all',              label: 'All' },
    { value: 'pending',          label: 'Pending' },
    { value: 'in_progress',      label: 'In Progress' },
    { value: 'waiting_on_parts', label: 'Waiting for the Kit' },
    { value: 'completed',        label: 'Completed' },
    { value: 'delivered',        label: 'Delivered' },
  ]

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">All Jobs</h1>
        <a
          href="/ops/jobs/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Job
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {statuses.map(s => (
          <a
            key={s.value}
            href={`/ops/jobs?status=${s.value}${q ? `&q=${q}` : ''}`}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              (status ?? 'all') === s.value
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            {s.label}
          </a>
        ))}
      </div>

      {/* Search */}
      <form method="get" action="/ops/jobs">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by job ID, vehicle, or customer…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      {/* Jobs Table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">No jobs found.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {filtered.map(v => {
            const customer = v.customers as { name: string } | null
            const isOverdue = v.estimated_completion_date &&
              new Date(v.estimated_completion_date) < new Date() &&
              !['completed', 'delivered'].includes(v.build_status)
            return (
              <a
                key={v.id}
                href={`/ops/jobs/${v.id}`}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {v.vehicle_year} {v.vehicle_make} {v.vehicle_model}
                    {isOverdue && <span className="ml-2 text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">Overdue</span>}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {v.job_id} · {v.build_type}
                    {customer ? ` · ${customer.name}` : ''}
                  </p>
                  {v.estimated_completion_date && (
                    <p className="text-xs text-slate-300 mt-0.5">
                      Due {new Date(v.estimated_completion_date).toLocaleDateString('en-AU', {
                        day: 'numeric', month: 'short'
                      })}
                    </p>
                  )}
                </div>
                <span className={`ml-4 shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOURS[v.build_status as BuildStatus]}`}>
                  {STATUS_LABELS[v.build_status as BuildStatus]}
                </span>
              </a>
            )
          })}
        </div>
      )}

      <p className="text-xs text-slate-400">{filtered.length} job{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
