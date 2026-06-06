import { createClient } from '@/lib/supabase/server'
import type { BuildStatus } from '@/types/database'
import Link from 'next/link'
import SortSelect from '@/components/SortSelect'

const DONE_PAGE_SIZE = 10

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

const DASHBOARD_STATUSES: BuildStatus[] = [
  'pending', 'kit_designing', 'kit_production', 'kit_dispatched',
  'in_progress', 'waiting_on_compliance', 'completed', 'delivered'
]

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

const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest first' },
  { value: 'oldest',   label: 'Oldest first' },
  { value: 'due_date', label: 'Due date (soonest)' },
  { value: 'priority', label: 'Priority (overdue first)' },
  { value: 'customer', label: 'Customer (A–Z)' },
]

type ActiveVehicle = {
  id: string
  job_id: string
  vehicle_make: string
  vehicle_model: string
  vehicle_year: number | null
  build_status: string
  build_type: string
  estimated_completion_date: string | null
  created_at: string
  customers: { name: string } | null
}

function sortVehicles(vehicles: ActiveVehicle[], sort: string): ActiveVehicle[] {
  const v = [...vehicles]
  switch (sort) {
    case 'oldest':
      return v.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    case 'due_date':
      return v.sort((a, b) => {
        if (!a.estimated_completion_date && !b.estimated_completion_date) return 0
        if (!a.estimated_completion_date) return 1
        if (!b.estimated_completion_date) return -1
        return new Date(a.estimated_completion_date).getTime() - new Date(b.estimated_completion_date).getTime()
      })

    case 'priority': {
      const now = new Date()
      return v.sort((a, b) => {
        const aDate = a.estimated_completion_date ? new Date(a.estimated_completion_date) : null
        const bDate = b.estimated_completion_date ? new Date(b.estimated_completion_date) : null
        const aOverdue = aDate && aDate < now
        const bOverdue = bDate && bDate < now
        // Overdue jobs float to top
        if (aOverdue && !bOverdue) return -1
        if (!aOverdue && bOverdue) return 1
        // Within same group, sort by date ascending
        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1
        return aDate.getTime() - bDate.getTime()
      })
    }

    case 'customer':
      return v.sort((a, b) => {
        const nameA = a.customers?.name ?? ''
        const nameB = b.customers?.name ?? ''
        return nameA.localeCompare(nameB)
      })

    default: // 'newest'
      return v.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }
}

export default async function OpsDashboard({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }>
}) {
  const { page, sort } = await searchParams
  const donePage = Math.max(0, parseInt(page ?? '0', 10))
  const currentSort = SORT_OPTIONS.find(o => o.value === sort) ? sort! : 'newest'
  const supabase = await createClient()

  const [{ data: activeRaw }, { data: done, count: doneCount }, { data: allStatuses }] = await Promise.all([
    supabase
      .from('vehicles')
      .select('id, job_id, vehicle_make, vehicle_model, vehicle_year, build_status, build_type, estimated_completion_date, created_at, customers(name)')
      .not('build_status', 'in', '("completed","delivered")'),
    supabase
      .from('vehicles')
      .select('id, job_id, vehicle_make, vehicle_model, vehicle_year, build_status', { count: 'exact' })
      .in('build_status', ['completed', 'delivered'])
      .order('created_at', { ascending: false })
      .range(donePage * DONE_PAGE_SIZE, (donePage + 1) * DONE_PAGE_SIZE - 1),
    supabase
      .from('vehicles')
      .select('build_status'),
  ])

  const active = sortVehicles((activeRaw ?? []) as ActiveVehicle[], currentSort)

  // Build a base URL for the sort control (preserves page param if set)
  const baseUrl = donePage > 0 ? `/ops/dashboard?page=${donePage}` : '/ops/dashboard'

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <Link
          href="/ops/jobs/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Job
        </Link>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Active Jobs {active.length > 0 && <span className="text-slate-400 font-normal">({active.length})</span>}
          </h2>
          <SortSelect
            value={currentSort}
            options={SORT_OPTIONS}
            baseUrl={baseUrl}
          />
        </div>

        {!active.length ? (
          <p className="text-sm text-slate-400">No active jobs.</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {active.map(v => {
              const isOverdue = v.estimated_completion_date &&
                new Date(v.estimated_completion_date) < new Date() &&
                !['completed', 'delivered'].includes(v.build_status)
              const customerName = v.customers?.name ?? null

              return (
                <Link
                  key={v.id}
                  href={`/ops/jobs/${v.id}`}
                  prefetch={true}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {v.vehicle_year} {v.vehicle_make} {v.vehicle_model}
                      {isOverdue && (
                        <span className="ml-2 text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                          Overdue
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {v.job_id}
                      {customerName && <> · <span className="text-slate-500">{customerName}</span></>}
                      {v.estimated_completion_date && (
                        <> · Due {new Date(v.estimated_completion_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                      )}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOURS[v.build_status as BuildStatus]}`}>
                    {STATUS_LABELS[v.build_status as BuildStatus]}
                  </span>
                </Link>
              )
            })}
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
              <Link
                key={v.id}
                href={`/ops/jobs/${v.id}`}
                prefetch={true}
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
              </Link>
            ))}
          </div>
          {(doneCount ?? 0) > DONE_PAGE_SIZE && (
            <div className="flex justify-between mt-3">
              {donePage > 0 ? (
                <a href={`?page=${donePage - 1}${currentSort !== 'newest' ? `&sort=${currentSort}` : ''}`} className="text-xs text-blue-600 hover:underline">← Newer</a>
              ) : <span />}
              {(donePage + 1) * DONE_PAGE_SIZE < (doneCount ?? 0) && (
                <a href={`?page=${donePage + 1}${currentSort !== 'newest' ? `&sort=${currentSort}` : ''}`} className="text-xs text-blue-600 hover:underline">Older →</a>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
