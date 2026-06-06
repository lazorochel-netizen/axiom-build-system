import { createClient } from '@/lib/supabase/server'
import { updateKitStatus } from '@/actions/kit-orders'
import type { BuildStatus } from '@/types/database'
import SortSelect from '@/components/SortSelect'
import LangToggle from '@/components/LangToggle'

const KIT_STAGE_COLOURS: Record<string, string> = {
  pending:          'bg-slate-100 text-slate-600',
  kit_designing:    'bg-orange-100 text-orange-700',
  kit_production:   'bg-orange-100 text-orange-700',
  kit_dispatched:   'bg-yellow-100 text-yellow-700',
  waiting_on_parts: 'bg-amber-100 text-amber-700',
}

const KIT_STAGE_LABELS_EN: Record<string, string> = {
  pending:          'Not Started',
  kit_designing:    'Designing',
  kit_production:   'In Production',
  kit_dispatched:   'Dispatched',
  waiting_on_parts: 'Waiting for Kit',
}

const KIT_STAGE_LABELS_ZH: Record<string, string> = {
  pending:          '未开始',
  kit_designing:    '设计中',
  kit_production:   '生产中',
  kit_dispatched:   '已发货',
  waiting_on_parts: '等待套件',
}

const BUILD_STATUS_ACTIVE: BuildStatus[] = [
  'pending', 'kit_designing', 'kit_production', 'kit_dispatched', 'waiting_on_parts'
]

const SORT_OPTIONS_EN = [
  { value: 'newest',   label: 'Newest first' },
  { value: 'oldest',   label: 'Oldest first' },
  { value: 'due_date', label: 'Due date (soonest)' },
  { value: 'priority', label: 'Priority (overdue first)' },
]

const SORT_OPTIONS_ZH = [
  { value: 'newest',   label: '最新优先' },
  { value: 'oldest',   label: '最旧优先' },
  { value: 'due_date', label: '截止日期（最早）' },
  { value: 'priority', label: '优先级（逾期优先）' },
]

type Vehicle = {
  id: string
  job_id: string
  vehicle_make: string
  vehicle_model: string
  vehicle_year: number | null
  build_type: string
  build_status: string
  estimated_completion_date: string | null
  created_at: string
  notes: string | null
  kit_orders: { id: string; status: string; manufacturer_notes: string | null; updated_at: string } | null
}

function sortVehicles(vehicles: Vehicle[], sort: string): Vehicle[] {
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
    default:
      return v.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }
}

export default async function ManufacturerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; lang?: string }>
}) {
  const { sort, lang } = await searchParams
  const isZh = lang === 'zh'
  const SORT_OPTIONS = isZh ? SORT_OPTIONS_ZH : SORT_OPTIONS_EN
  const KIT_STAGE_LABELS = isZh ? KIT_STAGE_LABELS_ZH : KIT_STAGE_LABELS_EN
  const currentSort = SORT_OPTIONS_EN.find(o => o.value === sort) ? sort! : 'newest'
  const supabase = await createClient()

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(`
      id, job_id, vehicle_make, vehicle_model, vehicle_year,
      build_type, build_status, estimated_completion_date, created_at, notes,
      kit_orders ( id, status, manufacturer_notes, updated_at )
    `)
    .in('build_status', BUILD_STATUS_ACTIVE)

  const active = sortVehicles((vehicles ?? []) as Vehicle[], currentSort)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {isZh ? '套件订单' : 'Kit Orders'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isZh
              ? '更新每个工单的套件制造状态。操作人员将自动收到通知。'
              : 'Update the kit manufacture status for each job. Ops are notified automatically.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {active.length > 0 && (
            <SortSelect
              value={currentSort}
              options={SORT_OPTIONS}
              baseUrl={`/manufacturer/dashboard${isZh ? '?lang=zh' : ''}`}
            />
          )}
          <LangToggle lang={lang ?? 'en'} baseUrl="/manufacturer/dashboard" />
        </div>
      </div>

      {active.length === 0 ? (
        <p className="text-sm text-slate-400 py-12 text-center">
          {isZh ? '目前没有进行中的工单。' : 'No active jobs at the moment.'}
        </p>
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
                        {isOverdue
                          ? (isZh ? '⚠ 已逾期 · ' : '⚠ Overdue · ')
                          : (isZh ? '目标：' : 'Target: ')}
                        {new Date(v.estimated_completion_date).toLocaleDateString(
                          isZh ? 'zh-CN' : 'en-AU',
                          { day: 'numeric', month: 'short', year: 'numeric' }
                        )}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${KIT_STAGE_COLOURS[currentStatus] ?? 'bg-slate-100 text-slate-500'}`}>
                    {KIT_STAGE_LABELS[currentStatus] ?? currentStatus.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Ops notes */}
                {v.notes && (
                  <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                      {isZh ? 'Axiom 操作备注' : 'Build Notes from Axiom Ops'}
                    </p>
                    <p className="text-sm text-amber-900 whitespace-pre-line">{v.notes}</p>
                  </div>
                )}

                {/* Kit status update form */}
                <form action={updateKitStatus} className="px-5 py-4 space-y-3">
                  <input type="hidden" name="vehicle_id" value={v.id} />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {isZh ? '套件状态' : 'Kit Status'}
                      </label>
                      <select
                        name="status"
                        defaultValue={currentStatus === 'pending' ? 'designing' : currentStatus.replace('kit_', '')}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]"
                      >
                        <option value="designing">{isZh ? '设计中' : 'Designing'}</option>
                        <option value="production">{isZh ? '生产中' : 'In Production'}</option>
                        <option value="completed">{isZh ? '套件已完成' : 'Kit Completed'}</option>
                        <option value="dispatched">{isZh ? '已发货' : 'Dispatched'}</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full bg-[#5B2D8E] hover:bg-[#4A2478] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        {isZh ? '更新状态' : 'Update Status'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {isZh ? '备注给 Axiom' : 'Notes to Axiom'}{' '}
                      <span className="text-slate-400 font-normal">
                        {isZh ? '（可选 — 例如定制、交货期、延误）' : '(optional — e.g. customisations, lead time, delays)'}
                      </span>
                    </label>
                    <textarea
                      name="manufacturer_notes"
                      defaultValue={kit?.manufacturer_notes ?? ''}
                      rows={2}
                      placeholder={isZh ? '例如：按要求焊接了定制太阳能支架，周一发货。' : 'e.g. Custom solar bracket welded as requested. Dispatching Monday.'}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E] resize-none"
                    />
                  </div>

                  {kit?.updated_at && (
                    <p className="text-xs text-slate-400">
                      {isZh ? '最后更新：' : 'Last updated '}
                      {new Date(kit.updated_at).toLocaleDateString(
                        isZh ? 'zh-CN' : 'en-AU',
                        { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
                      )}
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
