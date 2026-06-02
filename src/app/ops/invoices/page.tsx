import { createClient } from '@/lib/supabase/server'
import type { InvoiceStatus } from '@/types/database'

const STATUS_COLOURS: Record<InvoiceStatus, string> = {
  draft:   'bg-slate-100 text-slate-600',
  sent:    'bg-blue-100 text-blue-700',
  paid:    'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
}

export default async function InvoicesPage() {
  const supabase = await createClient()

  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      *,
      vehicles ( job_id, vehicle_make, vehicle_model, id ),
      customers ( name )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Invoices</h1>
        <span className="text-sm text-slate-400">{invoices?.length ?? 0} total</span>
      </div>

      {!invoices?.length ? (
        <p className="text-sm text-slate-400 py-8 text-center">No invoices yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {invoices.map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between px-5 py-4 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    {inv.customers?.name ?? '—'}
                  </p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[inv.status as InvoiceStatus]}`}>
                    {inv.status}
                  </span>
                </div>
                {inv.vehicles && (
                  <a
                    href={`/ops/jobs/${inv.vehicles.id}`}
                    className="text-xs text-blue-600 hover:underline mt-0.5 inline-block"
                  >
                    {inv.vehicles.job_id} · {inv.vehicles.vehicle_make} {inv.vehicles.vehicle_model}
                  </a>
                )}
                {inv.due_date && (
                  <p className="text-xs text-slate-400 mt-1">
                    Due {new Date(inv.due_date).toLocaleDateString('en-AU')}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-slate-900">
                  ${inv.total_amount.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(inv.created_at).toLocaleDateString('en-AU')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
