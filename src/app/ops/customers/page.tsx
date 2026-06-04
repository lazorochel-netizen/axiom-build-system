import { createClient } from '@/lib/supabase/server'
import type { Customer, Vehicle } from '@/types/database'

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('customers')
    .select('*, vehicles(id, job_id, vehicle_make, vehicle_model, build_status)')
    .order('created_at', { ascending: false })

  if (q) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
  }

  const { data: customers } = await query

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Customers</h1>
        <span className="text-sm text-slate-400">{customers?.length ?? 0} total</span>
      </div>

      {/* Search */}
      <form method="get" action="/ops/customers">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by name, email, or phone…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      {!customers?.length ? (
        <p className="text-sm text-slate-400 py-8 text-center">No customers yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {customers.map((customer: Customer & { vehicles: Pick<Vehicle, 'id' | 'job_id' | 'vehicle_make' | 'vehicle_model' | 'build_status'>[] }) => (
            <div key={customer.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{customer.name}</p>
                  <div className="flex gap-3 mt-0.5">
                    {customer.email && <p className="text-xs text-slate-400">{customer.email}</p>}
                    {customer.phone && <p className="text-xs text-slate-400">{customer.phone}</p>}
                  </div>
                </div>
                <a
                  href={`/portal/${customer.portal_token}`}
                  target="_blank"
                  className="text-xs text-blue-600 hover:underline shrink-0"
                >
                  Portal link →
                </a>
              </div>

              {customer.vehicles?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {customer.vehicles.map(v => (
                    <a
                      key={v.id}
                      href={`/ops/jobs/${v.id}`}
                      className="inline-flex items-center gap-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-600 transition-colors"
                    >
                      <span className="font-medium">{v.job_id}</span>
                      <span className="text-slate-400">·</span>
                      <span>{v.vehicle_make} {v.vehicle_model}</span>
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                        v.build_status === 'completed' || v.build_status === 'delivered'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {v.build_status.replace(/_/g, ' ')}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
