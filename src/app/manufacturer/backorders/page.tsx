import { createClient as createRawClient } from '@supabase/supabase-js'
import { updateBackorderStatus } from '@/actions/kit-backorders'
import LangToggle from '@/components/LangToggle'
import type { BackorderStatus, KitBackorder } from '@/types/database'

// Statuses the manufacturer can move a request TO
const MANUFACTURER_STATUSES: BackorderStatus[] = ['acknowledged', 'in_production', 'dispatched']

const STATUS_COLOURS: Record<BackorderStatus, string> = {
  requested:    'bg-slate-100 text-slate-600',
  acknowledged: 'bg-blue-100 text-blue-700',
  in_production:'bg-orange-100 text-orange-700',
  dispatched:   'bg-yellow-100 text-yellow-700',
  received:     'bg-green-100 text-green-700',
}

const STATUS_LABELS_EN: Record<BackorderStatus, string> = {
  requested:    'Requested',
  acknowledged: 'Acknowledged',
  in_production:'In Production',
  dispatched:   'Dispatched',
  received:     'Received',
}

const STATUS_LABELS_ZH: Record<BackorderStatus, string> = {
  requested:    '已请求',
  acknowledged: '已确认',
  in_production:'生产中',
  dispatched:   '已发货',
  received:     '已收货',
}

const SELECT_OPTIONS_EN: { value: BackorderStatus; label: string }[] = [
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'in_production', label: 'In Production' },
  { value: 'dispatched', label: 'Dispatched' },
]

const SELECT_OPTIONS_ZH: { value: BackorderStatus; label: string }[] = [
  { value: 'acknowledged', label: '已确认' },
  { value: 'in_production', label: '生产中' },
  { value: 'dispatched', label: '已发货' },
]

export default async function ManufacturerBackordersPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; show?: string }>
}) {
  const { lang, show } = await searchParams
  const isZh = lang === 'zh'
  const showReceived = show === 'received'
  const STATUS_LABELS = isZh ? STATUS_LABELS_ZH : STATUS_LABELS_EN
  const SELECT_OPTIONS = isZh ? SELECT_OPTIONS_ZH : SELECT_OPTIONS_EN

  const admin = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let query = admin
    .from('kit_backorders')
    .select('*')
    .order('created_at', { ascending: false })

  if (!showReceived) {
    query = query.neq('status', 'received')
  }

  const { data: raw } = await query
  const items = (raw ?? []) as KitBackorder[]

  const open     = items.filter(b => b.status !== 'received')
  const received = items.filter(b => b.status === 'received')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {isZh ? '补货请求' : 'Restock Requests'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isZh
              ? 'Axiom 运营团队发出的套件补货请求。请更新每项的状态。'
              : 'Kit restock requests raised by Axiom Ops. Update each item as you progress.'}
          </p>
        </div>
        <LangToggle lang={lang ?? 'en'} baseUrl="/manufacturer/backorders" />
      </div>

      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
          open.length > 0
            ? 'bg-orange-50 text-orange-700 border-orange-200'
            : 'bg-slate-50 text-slate-500 border-slate-200'
        }`}>
          {open.length} {isZh ? '项待处理' : open.length === 1 ? 'open request' : 'open requests'}
        </span>
        {!showReceived && received.length === 0 ? null : !showReceived ? (
          <a
            href={`/manufacturer/backorders?${isZh ? 'lang=zh&' : ''}show=received`}
            className="text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors"
          >
            {isZh ? `查看 ${received.length} 条已完成` : `View ${received.length} received`}
          </a>
        ) : (
          <a
            href={`/manufacturer/backorders${isZh ? '?lang=zh' : ''}`}
            className="text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors"
          >
            {isZh ? '隐藏已完成' : 'Hide received'}
          </a>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 py-12 text-center">
          {isZh ? '目前没有补货请求。' : 'No restock requests at the moment.'}
        </p>
      ) : (
        <div className="space-y-4">
          {items.map(item => {
            const isComplete = item.status === 'received'
            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border overflow-hidden ${
                  isComplete ? 'border-slate-100 opacity-70' : 'border-slate-200'
                }`}
              >
                {/* Request details from Ops */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900">{item.kit_type}</p>
                        <span className="text-xs text-slate-400">× {item.quantity}</span>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLOURS[item.status]}`}>
                          {STATUS_LABELS[item.status]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {isZh ? '请求日期：' : 'Requested '}
                        {new Date(item.created_at).toLocaleDateString(
                          isZh ? 'zh-CN' : 'en-AU',
                          { day: 'numeric', month: 'short', year: 'numeric' }
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Ops notes */}
                  {item.ops_notes && (
                    <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">
                        {isZh ? 'Axiom 运营备注' : 'Notes from Axiom Ops'}
                      </p>
                      <p className="text-sm text-amber-900 whitespace-pre-line">{item.ops_notes}</p>
                    </div>
                  )}
                </div>

                {/* Manufacturer update form — hidden once received */}
                {!isComplete && (
                  <form action={updateBackorderStatus} className="px-5 py-4 space-y-3">
                    <input type="hidden" name="id" value={item.id} />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          {isZh ? '更新状态' : 'Update Status'}
                        </label>
                        <select
                          name="status"
                          defaultValue={MANUFACTURER_STATUSES.includes(item.status) ? item.status : 'acknowledged'}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]"
                        >
                          {SELECT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full bg-[#5B2D8E] hover:bg-[#4A2478] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                          {isZh ? '更新' : 'Update'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {isZh ? '备注给 Axiom' : 'Notes to Axiom'}{' '}
                        <span className="text-slate-400 font-normal">
                          {isZh ? '（可选 — 例如交期、跟踪号）' : '(optional — e.g. lead time, tracking number, ETA)'}
                        </span>
                      </label>
                      <textarea
                        name="manufacturer_notes"
                        defaultValue={item.manufacturer_notes ?? ''}
                        rows={2}
                        placeholder={isZh ? '例如：已下单，预计 10 个工作日内到货。快递单号：XP123456789AU' : 'e.g. Ordered. ETA 10 business days. Tracking: XP123456789AU'}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E] resize-none"
                      />
                    </div>

                    {item.updated_at !== item.created_at && (
                      <p className="text-xs text-slate-400">
                        {isZh ? '最后更新：' : 'Last updated '}
                        {new Date(item.updated_at).toLocaleDateString(
                          isZh ? 'zh-CN' : 'en-AU',
                          { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
                        )}
                      </p>
                    )}
                  </form>
                )}

                {/* Received state */}
                {isComplete && (
                  <div className="px-5 py-3 bg-green-50 border-t border-green-100">
                    <p className="text-xs text-green-700 font-medium">
                      {isZh ? '✓ Axiom 已确认收货' : '✓ Received by Axiom'}
                      {item.received_at && (
                        <span className="font-normal text-green-600">
                          {' · '}
                          {new Date(item.received_at).toLocaleDateString(
                            isZh ? 'zh-CN' : 'en-AU',
                            { day: 'numeric', month: 'short', year: 'numeric' }
                          )}
                        </span>
                      )}
                    </p>
                    {item.manufacturer_notes && (
                      <p className="text-xs text-green-800 mt-0.5">{item.manufacturer_notes}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
