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

  const [{ data: quotations }, { data: buildLogs }] = await Promise.all([
    supabase
      .from('quotations')
      .select('*, vehicles(job_id, vehicle_make, vehicle_model, id), customers(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('build_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-xl font-semibold text-slate-900">Quotations</h1>

      {/* Build Logs — ready to convert */}
      {buildLogs && buildLogs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">From Build Log Sheet</h2>
            <span className="text-xs text-slate-400">{buildLogs.length} saved</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {buildLogs.map((log: any) => (
              <div key={log.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{log.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {log.customer_name && <span>{log.customer_name} · </span>}
                      {log.vehicle_info && <span>{log.vehicle_info} · </span>}
                      {log.spec_label}
                    </p>
                    {log.rego_vin && <p className="text-xs text-slate-400">{log.rego_vin}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-900">${Number(log.total_amount).toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(log.created_at).toLocaleDateString('en-AU')}
                    </p>
                  </div>
                </div>

                {/* Add-ons summary */}
                {log.addon_rows?.filter((r: any) => r.ticked && r.desc).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {log.addon_rows.filter((r: any) => r.ticked && r.desc).map((r: any, i: number) => (
                      <span key={i} className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-slate-600">
                        {r.desc} {r.price ? `· $${Number(r.price).toLocaleString()}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Existing Quotations */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Quotations</h2>
        {!quotations?.length ? (
          <p className="text-sm text-slate-400">No quotations yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {quotations.map((q: any) => (
              <div key={q.id} className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{q.customers?.name ?? '—'}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[q.status as QuotationStatus]}`}>
                      {q.status}
                    </span>
                  </div>
                  {q.vehicles && (
                    <a href={`/ops/jobs/${q.vehicles.id}`} className="text-xs text-blue-600 hover:underline mt-0.5 inline-block">
                      {q.vehicles.job_id} · {q.vehicles.vehicle_make} {q.vehicles.vehicle_model}
                    </a>
                  )}
                  {q.notes && <p className="text-xs text-slate-400 mt-1 truncate">{q.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-900">${q.total_amount.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(q.created_at).toLocaleDateString('en-AU')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
