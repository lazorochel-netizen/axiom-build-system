import { createClient } from '@/lib/supabase/server'
import type { BuildStatus } from '@/types/database'
import SortSelect from '@/components/SortSelect'

const STATUS_COLOURS: Record<BuildStatus, string> = {
  pending:                'bg-slate-100 text-slate-600',
  kit_designing:          'bg-orange-100 text-orange-700',
  kit_production:         'bg-orange-100 text-orange-700',
  kit_dispatched:         'bg-yellow-100 text-yellow-700',
  in_progress:            'bg-blue-100 text-blue-700',
  waiting_on_parts:       'bg-amber-100 text-amber-700',
  waiting_on_compliance:  'bg-purple-100 text-purple-700',
  completed:              'bg-green-100 text-green-700',
  delivered:              'bg-slate-200 text-slate-500',
}

const STATUS_LABELS: Record<BuildStatus, string> = {
  pending:                'Pending',
  kit_designing:          'Kit: Designing',
  kit_production:         'Kit: In Production',
  kit_dispatched:         'Kit: Dispatched',
  in_progress:            'In Progress',
  waiting_on_parts:       'Waiting for Kit',
  waiting_on_compliance:  'In Compliance',
  completed:              'Completed',
  delivered:              'Delivered',
}

type SortKey = 'newest' | 'oldest' | 'due_asc' | 'due_desc' | 'status'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest',   label: 'Newest first' },
  { value: 'oldest',   label: 'Oldest first' },
  { value: 'due_asc',  label: 'Due date ↑' },
  { value: 'due_desc', label: 'Due date ↓' },
  { value: 'status',   label: 'By status' },
]

function buildSortQuery(query: any, sort: SortKey) {
  switch (sort) {
    case 'oldest':   return query.order('created_at', { ascending: true })
    case 'due_asc':  return query.order('estimated_completion_date', { ascending: true,  nullsFirst: false })
    case 'due_desc': return query.order('estimated_completion_date', { ascending: false, nullsFirst: false })
    case 'status':   return query.order('build_status', { ascending: true }).order('created_at', { ascending: false })
    default:         return query.order('created_at', { ascending: false })
  }
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; sort?: string }>
}) {
  const { status, q, sort: sortParam } = await searchParams
  const sort = (SORT_OPTIONS.find(o => o.value === sortParam)?.value ?? 'newest') as SortKey
  const supabase = await createClient()

  let query = supabase
    .from('vehicles')
    .select(`
      id, job_id, vehicle_make, vehicle_model, vehicle_year,
      build_type, build_status, estimated_completion_date,
      customers ( name )
    `)

  if (status && status !== 'all') {
    query = query.eq('build_status', status as BuildStatus)
  }

  if (q) {
    query = query.or(
      `job_id.ilike.%${q}%,vehicle_make.ilike.%${q}%,vehicle_model.ilike.%${q}%`
    )
  }

  query = buildSortQuery(query, sort)

  const { data: vehicles } = await query
  const filtered = vehicles ?? []

  const statuses: { value: string; label: string }[] = [
    { value: 'all',                  label: 'All' },
    { value: 'pending',              label: 'Pending' },
    { value: 'kit_designing',        label: 'Kit: Designing' },
    { value: 'kit_production',       label: 'Kit: In Production' },
    { value: 'kit_dispatched',       label: 'Kit: Dispatched' },
    { value: 'in_progress',          label: 'In Progress' },
    { value: 'waiting_on_parts',     label: 'Waiting for Kit' },
    { value: 'waiting_on_compliance',label: 'In Compliance' },
    { value: 'completed',            label: 'Completed' },
    { value: 'delivered',            label: 'Delivered' },
  ]

  // Build URL helper that preserves all active params
  function url(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    if (status && status !== 'all') params.set('status', status)
    if (q) params.set('q', q)
    if (sort !== 'newest') params.set('sort', sort)
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    const str = params.toString()
    return `/ops/jobs${str ? `?${str}` : ''}`
  }

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

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {statuses.map(s => (
          <a
            key={s.value}
            href={url({ status: s.value === 'all' ? '' : s.value })}
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

      {/* Search + Sort row */}
      <div className="flex gap-2 items-center">
        <form method="get" action="/ops/jobs" className="flex-1">
          {status && status !== 'all' && <input type="hidden" name="status" value={status} />}
          {sort !== 'newest' && <input type="hidden" name="sort" value={sort} />}
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by job ID, vehicle, or customer…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        <SortSelect
          value={sort}
          options={SORT_OPTIONS}
          baseUrl={url({ sort: '' })}
        />
      </div>

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
