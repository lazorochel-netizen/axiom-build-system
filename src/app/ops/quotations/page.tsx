import { createClient } from '@/lib/supabase/server'
import type { QuotationStatus } from '@/types/database'

const STATUS_COLOURS: Record<QuotationStatus, string> = {
  draft:    'bg-slate-100 text-slate-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
}

export default async function QuotationsPage() {
  const supabase = await createClient()

  const { data: quotations } = await supabase
    .from('quotations')
    .select(`
      *,
      vehicles ( job_id, vehicle_make, vehicle_model, id ),
      customers ( name )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Quotations</h1>
        <span className="text-sm text-slate-400">{quotations?.length ?? 0} total</span>
      </div>

      {!quotations?.length ? (
        <p className="text-sm text-slate-400 py-8 text-center">No quotations yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {quotations.map((q: any) => (
            <div key={q.id} className="flex items-center justify-between px-5 py-4 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    {q.customers?.name ?? '—'}
                  </p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[q.status as QuotationStatus]}`}>
                    {q.status}
                  </span>
                </div>
                {q.vehicles && (
                  <a
                    href={`/ops/jobs/${q.vehicles.id}`}
                    className="text-xs text-blue-600 hover:underline mt-0.5 inline-block"
                  >
                    {q.vehicles.job_id} · {q.vehicles.vehicle_make} {q.vehicles.vehicle_model}
                  </a>
                )}
                {q.notes && <p className="text-xs text-slate-400 mt-1 truncate">{q.notes}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-slate-900">
                  ${q.total_amount.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(q.created_at).toLocaleDateString('en-AU')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
