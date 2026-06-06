import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buildCustomerUpdateHtml } from '@/lib/email-templates'

export default async function EmailPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ message?: string }>
}) {
  const { id } = await params
  const { message } = await searchParams
  const supabase = await createClient()

  const { data: vehicle } = await (supabase.from('vehicles') as any)
    .select(`
      job_id, vehicle_year, vehicle_make, vehicle_model, build_status,
      customers ( name, email, portal_token )
    `)
    .eq('id', id)
    .single() as { data: { job_id: string; vehicle_year: number | null; vehicle_make: string; vehicle_model: string; build_status: string; customers: { name: string; email: string | null; portal_token: string } | null } | null }

  if (!vehicle) notFound()

  const customer = vehicle.customers as { name: string; email: string | null; portal_token: string } | null
  const baseUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const portalUrl = `${baseUrl}/portal/${customer?.portal_token ?? ''}`

  const html = buildCustomerUpdateHtml({
    customerName:  customer?.name ?? 'Customer',
    jobId:         vehicle.job_id,
    vehicleYear:   vehicle.vehicle_year,
    vehicleMake:   vehicle.vehicle_make,
    vehicleModel:  vehicle.vehicle_model,
    buildStatus:   vehicle.build_status,
    customMessage: message ? decodeURIComponent(message) : null,
    portalUrl,
    workshopPhone: process.env.NEXT_PUBLIC_WORKSHOP_PHONE,
  })

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="text-sm font-semibold text-slate-900">Email Preview</p>
          <p className="text-xs text-slate-400 mt-0.5">
            To: {customer?.name ?? '—'} · {customer?.email ?? 'No email on file'}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/ops/jobs/${id}`}
            className="text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            ← Back to Job
          </a>
        </div>
      </div>

      {/* Subject line preview */}
      <div className="max-w-2xl mx-auto mt-6 mb-2 px-4">
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-400 mb-0.5">Subject</p>
          <p className="text-sm font-medium text-slate-900">
            Build update for your {vehicle.vehicle_make} {vehicle.vehicle_model} — {vehicle.job_id}
          </p>
        </div>
      </div>

      {/* Email body rendered in iframe for accurate preview */}
      <div className="max-w-2xl mx-auto px-4 pb-10">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <iframe
            srcDoc={html}
            className="w-full"
            style={{ height: '640px', border: 'none' }}
            title="Email preview"
          />
        </div>
        <p className="text-xs text-slate-400 text-center mt-3">
          This is an exact preview of what the customer will receive.
        </p>
      </div>
    </div>
  )
}
