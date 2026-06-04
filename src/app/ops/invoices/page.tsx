import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { InvoiceStatus } from '@/types/database'
import { createInvoice, convertQuotationToInvoice, createInvoiceFromBuildLog, updateInvoiceStatus } from '@/actions/invoices'

const STATUS_COLOURS: Record<InvoiceStatus, string> = {
  draft:   'bg-slate-100 text-slate-600',
  sent:    'bg-blue-100 text-blue-700',
  paid:    'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
}

export default async function InvoicesPage() {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const [
    { data: invoices },
    { data: quotations },
    { data: vehicles },
    { data: customers },
    buildLogsResult,
  ] = await Promise.all([
    supabase.from('invoices').select('*, vehicles(job_id, vehicle_make, vehicle_model, id), customers(name), invoice_items(id, description, quantity, unit_price)').order('created_at', { ascending: false }),
    supabase.from('quotations').select('*, vehicles(job_id, vehicle_make, vehicle_model), customers(name)').in('status', ['draft', 'sent', 'accepted']).order('created_at', { ascending: false }),
    supabase.from('vehicles').select('id, job_id, vehicle_make, vehicle_model, customer_id').order('created_at', { ascending: false }),
    supabase.from('customers').select('id, name').order('name'),
    (admin.from('build_logs') as any).select('*').order('created_at', { ascending: false }).limit(20),
  ])

  const buildLogs = buildLogsResult.data ?? []

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-xl font-semibold text-slate-900">Invoices</h1>

      {/* Create Invoice directly */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Create New Invoice</h2>
        <form action={createInvoice} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Job / Vehicle</label>
              <select name="vehicle_id" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">No job linked</option>
                {(vehicles ?? []).map((v: any) => (
                  <option key={v.id} value={v.id}>{v.job_id} · {v.vehicle_make} {v.vehicle_model}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Customer</label>
              <select name="customer_id" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">No customer linked</option>
                {(customers ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
            <input name="due_date" type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Line items */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Line Items</label>
            <div className="space-y-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="grid grid-cols-[1fr_80px_100px] gap-2">
                  <input name="item_desc" placeholder={i === 0 ? 'e.g. Conversion Kit — Hiace SLWB' : 'Description'} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input name="item_qty" type="number" step="0.01" defaultValue="1" placeholder="Qty" className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
                  <input name="item_price" type="number" step="0.01" placeholder="Price" className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">Total is calculated automatically from line items. Leave all items blank to enter a manual total below.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Manual Total (if no line items)</label>
            <input name="total_amount" type="number" step="0.01" placeholder="e.g. 19999" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea name="notes" rows={2} placeholder="Optional notes" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
            Create Invoice
          </button>
        </form>
      </section>

      {/* Convert from Quotation */}
      {quotations && quotations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Convert Quotation to Invoice</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {quotations.map((q: any) => (
              <div key={q.id} className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{q.customers?.name ?? '—'}</p>
                  {q.vehicles && <p className="text-xs text-slate-400">{q.vehicles.job_id} · {q.vehicles.vehicle_make} {q.vehicles.vehicle_model}</p>}
                  <p className="text-xs text-slate-400">${Number(q.total_amount).toLocaleString()} · {q.status}</p>
                </div>
                <form action={convertQuotationToInvoice} className="flex items-center gap-2 shrink-0">
                  <input type="hidden" name="quotation_id" value={q.id} />
                  <input type="date" name="due_date" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="submit" className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                    → Invoice
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Create from Build Log */}
      {buildLogs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Create from Build Log Sheet</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {buildLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{log.name}</p>
                  <p className="text-xs text-slate-400">{log.customer_name} · {log.spec_label}</p>
                  <p className="text-xs text-slate-400">${Number(log.total_amount).toLocaleString()}</p>
                </div>
                <form action={createInvoiceFromBuildLog} className="flex items-center gap-2 shrink-0">
                  <input type="hidden" name="build_log_id" value={log.id} />
                  <select name="vehicle_id" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">No job</option>
                    {(vehicles ?? []).map((v: any) => (
                      <option key={v.id} value={v.id}>{v.job_id}</option>
                    ))}
                  </select>
                  <input type="date" name="due_date" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                    Create Invoice
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Existing Invoices */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">All Invoices</h2>
        {!invoices?.length ? (
          <p className="text-sm text-slate-400">No invoices yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="px-5 py-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{inv.customers?.name ?? '—'}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[inv.status as InvoiceStatus]}`}>{inv.status}</span>
                  </div>
                  {inv.vehicles && (
                    <a href={`/ops/jobs/${inv.vehicles.id}`} className="text-xs text-blue-600 hover:underline mt-0.5 inline-block">
                      {inv.vehicles.job_id} · {inv.vehicles.vehicle_make} {inv.vehicles.vehicle_model}
                    </a>
                  )}
                  {inv.due_date && <p className="text-xs text-slate-400 mt-1">Due {new Date(inv.due_date).toLocaleDateString('en-AU')}</p>}
                  {inv.notes && <p className="text-xs text-slate-400 mt-1 truncate">{inv.notes}</p>}
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-sm font-semibold text-slate-900">${inv.total_amount.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">{new Date(inv.created_at).toLocaleDateString('en-AU')}</p>
                  <form action={updateInvoiceStatus} className="flex gap-1 justify-end flex-wrap">
                    <input type="hidden" name="invoice_id" value={inv.id} />
                    {inv.status !== 'sent' && (
                      <button name="status" value="sent" className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">Mark Sent</button>
                    )}
                    {inv.status !== 'paid' && (
                      <button name="status" value="paid" className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">Mark Paid</button>
                    )}
                    {inv.status !== 'draft' && (
                      <button name="status" value="draft" className="text-xs px-2 py-1 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors">Revert</button>
                    )}
                  </form>
                </div>
                </div>
                {/* Line items breakdown */}
                {inv.invoice_items && inv.invoice_items.length > 0 && (
                  <div className="border-t border-slate-100 pt-2 space-y-1">
                    {inv.invoice_items.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-xs text-slate-600">
                        <span>{item.description} {item.quantity !== 1 && `× ${item.quantity}`}</span>
                        <span className="font-medium">${(item.quantity * item.unit_price).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-semibold text-slate-900 border-t border-slate-200 pt-1 mt-1">
                      <span>Total</span>
                      <span>${Number(inv.total_amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
