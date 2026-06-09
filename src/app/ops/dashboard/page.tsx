import { createClient } from '@/lib/supabase/server'
import { createClient as createRawClient } from '@supabase/supabase-js'
import type { BuildStatus, BackorderStatus, KitBackorder } from '@/types/database'
import Link from 'next/link'
import SortSelect from '@/components/SortSelect'
import { createBackorder, receiveBackorder } from '@/actions/kit-backorders'
import DeleteBackorderButton from '@/components/DeleteBackorderButton'

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
  in_progress:            'bg-blue-100 text-[#4A2478]',
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

const BACKORDER_STATUS_LABELS: Record<BackorderStatus, string> = {
  requested:    'Requested',
  acknowledged: 'Acknowledged',
  in_production:'In Production',
  dispatched:   'Dispatched',
  received:     'Received',
}

const BACKORDER_STATUS_COLOURS: Record<BackorderStatus, string> = {
  requested:    'bg-slate-100 text-slate-600',
  acknowledged: 'bg-blue-100 text-blue-700',
  in_production:'bg-orange-100 text-orange-700',
  dispatched:   'bg-yellow-100 text-yellow-700',
  received:     'bg-green-100 text-green-700',
}

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
        if (aOverdue && !bOverdue) return -1
        if (!aOverdue && bOverdue) return 1
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
  const admin = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [{ data: activeRaw }, { data: done, count: doneCount }, { data: allStatuses }, { data: backordersRaw }] = await Promise.all([
    (supabase.from('vehicles') as any)
      .select('id, job_id, vehicle_make, vehicle_model, vehicle_year, build_status, build_type, estimated_completion_date, created_at, customers(name)')
      .not('build_status', 'in', '("completed","delivered")') as Promise<{ data: ActiveVehicle[] | null }>,
    (supabase.from('vehicles') as any)
      .select('id, job_id, vehicle_make, vehicle_model, vehicle_year, build_status', { count: 'exact' })
      .in('build_status', ['completed', 'delivered'])
      .order('created_at', { ascending: false })
      .range(donePage * DONE_PAGE_SIZE, (donePage + 1) * DONE_PAGE_SIZE - 1) as Promise<{ data: { id: string; job_id: string; vehicle_make: string; vehicle_model: string; vehicle_year: number | null; build_status: string }[] | null; count: number | null }>,
    (supabase.from('vehicles') as any)
      .select('build_status') as Promise<{ data: { build_status: string }[] | null }>,
    admin
      .from('kit_backorders')
      .select('*')
      .neq('status', 'received')
      .order('created_at', { ascending: false }) as Promise<{ data: KitBackorder[] | null }>,
  ])

  const active = sortVehicles((activeRaw ?? []) as ActiveVehicle[], currentSort)
  const baseUrl = donePage > 0 ? `/ops/dashboard?page=${donePage}` : '/ops/dashboard'
  const backorders = (backordersRaw ?? []) as KitBackorder[]

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <Link
          href="/ops/jobs/new"
          className="bg-[#5B2D8E] hover:bg-[#4A2478] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
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
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {v.vehicle_year} {v.vehicle_make} {v.vehicle_model}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {v.job_id}
                      {customerName && <> · {customerName}</>}
                    </p>
                    {v.estimated_completion_date && (
                      <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                        {isOverdue ? '⚠ Overdue · ' : 'Due '}
                        {new Date(v.estimated_completion_date).toLocaleDateString('en-AU', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 ml-3 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOURS[v.build_status as BuildStatus] ?? 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_LABELS[v.build_status as BuildStatus] ?? v.build_status}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Completed / Delivered jobs */}
      {(doneCount ?? 0) > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Completed &amp; Delivered <span className="text-slate-400 font-normal">({doneCount})</span>
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {(done ?? []).map(v => (
              <Link
                key={v.id}
                href={`/ops/jobs/${v.id}`}
                prefetch={true}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {v.vehicle_year} {v.vehicle_make} {v.vehicle_model}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{v.job_id}</p>
                </div>
                <span className={`shrink-0 ml-3 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOURS[v.build_status as BuildStatus] ?? 'bg-slate-100 text-slate-500'}`}>
                  {STATUS_LABELS[v.build_status as BuildStatus] ?? v.build_status}
                </span>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {(doneCount ?? 0) > DONE_PAGE_SIZE && (
            <div className="flex justify-between mt-3">
              {donePage > 0 ? (
                <Link href={`/ops/dashboard?page=${donePage - 1}${currentSort !== 'newest' ? `&sort=${currentSort}` : ''}`} className="text-sm text-[#5B2D8E] hover:underline">
                  ← Previous
                </Link>
              ) : <span />}
              {(donePage + 1) * DONE_PAGE_SIZE < (doneCount ?? 0) && (
                <Link href={`/ops/dashboard?page=${donePage + 1}${currentSort !== 'newest' ? `&sort=${currentSort}` : ''}`} className="text-sm text-[#5B2D8E] hover:underline">
                  Next →
                </Link>
              )}
            </div>
          )}
        </section>
      )}
      {/* Kit Restocking / Back Orders */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Kit Restocking
          {backorders.length > 0 && (
            <span className="text-slate-400 font-normal"> ({backorders.length} open)</span>
          )}
        </h2>

        {/* Create new back order */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-700">New Restock Request</p>
          </div>
          <form action={createBackorder} className="px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Kit / Component <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="kit_type"
                  required
                  placeholder="e.g. Canopy EV Kit, Bull Bar Pack"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Qty needed</label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  defaultValue="1"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Notes to Manufacturer{' '}
                <span className="text-slate-400 font-normal">(optional — urgency, specs, job references)</span>
              </label>
              <textarea
                name="ops_notes"
                rows={2}
                placeholder="e.g. Urgent — 3 pending jobs waiting. Needs custom solar bracket weld."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E] resize-none"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-[#5B2D8E] hover:bg-[#4A2478] text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                Send to Manufacturer
              </button>
            </div>
          </form>
        </div>

        {/* Open back orders list */}
        {backorders.length === 0 ? (
          <p className="text-sm text-slate-400">No open restock requests.</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {backorders.map(b => (
              <div key={b.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900">{b.kit_type}</p>
                      <span className="text-xs text-slate-400">× {b.quantity}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BACKORDER_STATUS_COLOURS[b.status]}`}>
                        {BACKORDER_STATUS_LABELS[b.status]}
                      </span>
                    </div>
                    {b.ops_notes && (
                      <p className="text-xs text-slate-500 mt-0.5">{b.ops_notes}</p>
                    )}
                    {b.manufacturer_notes && (
                      <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1">
                        <span className="font-medium">Manufacturer: </span>{b.manufacturer_notes}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Requested {new Date(b.created_at).toLocaleDateString('en-AU', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                      {b.updated_at !== b.created_at && (
                        <> · Updated {new Date(b.updated_at).toLocaleDateString('en-AU', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {b.status === 'dispatched' && (
                      <form action={receiveBackorder}>
                        <input type="hidden" name="id" value={b.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Mark Received
                        </button>
                      </form>
                    )}
                    <DeleteBackorderButton id={b.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
