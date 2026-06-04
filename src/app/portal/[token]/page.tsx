import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { BuildStatus } from '@/types/database'

/**
 * Customer portal — public, no login required.
 * Accessed via unique token link sent to the customer.
 */

const STAGE_LABELS: Record<BuildStatus, string> = {
  pending:               'Build Pending',
  in_progress:           'Build In Progress',
  waiting_on_parts:      'Waiting on Parts',
  waiting_on_compliance: 'In Compliance Review',
  completed:             'Build Complete — Ready for Handover',
  delivered:             'Delivered',
}

const STAGE_DESCRIPTIONS: Record<BuildStatus, string> = {
  pending:               'Your vehicle has been received and is awaiting the build team.',
  in_progress:           'Your build is underway. We\'ll keep this page updated as work progresses.',
  waiting_on_parts:      'We\'re waiting on parts to arrive before continuing your build.',
  waiting_on_compliance: 'Your vehicle is going through its compliance checks.',
  completed:             'Great news — your build is complete. Our team will be in touch to arrange handover.',
  delivered:             'Your vehicle has been delivered. Thank you for choosing Axiom Group.',
}

export default async function CustomerPortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  // Resolve token → customer → vehicle
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name')
    .eq('portal_token', token)
    .single()

  if (!customer) notFound()

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(`
      id, job_id, vehicle_make, vehicle_model, vehicle_year,
      build_status, estimated_completion_date,
      photos ( id, image_url, is_customer_visible, uploaded_at )
    `)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })

  if (!vehicles || vehicles.length === 0) notFound()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <p className="text-xs text-slate-400 uppercase tracking-wide">Axiom Group Australia</p>
        <h1 className="text-lg font-semibold text-slate-900 mt-0.5">Your Build Progress</h1>
        <p className="text-sm text-slate-500 mt-0.5">Hi {customer.name}</p>
      </div>

      <div className="px-4 py-6 space-y-8 max-w-lg mx-auto">
        {vehicles.map(vehicle => {
          const status = vehicle.build_status as BuildStatus
          const approvedPhotos = (vehicle.photos ?? []).filter(
            (p: { is_customer_visible?: boolean }) => p.is_customer_visible
          )

          return (
            <div key={vehicle.id} className="space-y-4">
              {vehicles.length > 1 && (
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Job {vehicle.job_id}
                </h2>
              )}

              {/* Vehicle */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-400 mb-1">Vehicle</p>
                <p className="text-base font-semibold text-slate-900">
                  {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Job {vehicle.job_id}</p>
              </div>

              {/* Status */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-400 mb-2">Current Status</p>
                <span className="inline-block bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1.5 rounded-full">
                  {STAGE_LABELS[status]}
                </span>
                <p className="text-sm text-slate-600 mt-3">{STAGE_DESCRIPTIONS[status]}</p>
                {vehicle.estimated_completion_date && (
                  <p className="text-xs text-slate-400 mt-3">
                    Estimated completion:{' '}
                    <span className="text-slate-700 font-medium">
                      {new Date(vehicle.estimated_completion_date).toLocaleDateString('en-AU', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </span>
                  </p>
                )}
              </div>

              {/* Approved Photos */}
              {approvedPhotos.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Build Photos</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {approvedPhotos.map((photo: { id: string; image_url: string; uploaded_at: string }) => (
                      <div key={photo.id} className="rounded-xl overflow-hidden bg-slate-200 aspect-video">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.image_url} alt="Build progress" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {vehicles.length > 1 && <hr className="border-slate-200" />}
            </div>
          )
        })}

        <p className="text-xs text-center text-slate-400 pb-4">
          Questions? Contact Axiom Group on{' '}
          <a href={`tel:${process.env.NEXT_PUBLIC_WORKSHOP_PHONE ?? ''}`} className="underline">
            {process.env.NEXT_PUBLIC_WORKSHOP_PHONE ?? 'our workshop number'}
          </a>.
        </p>
      </div>
    </div>
  )
}
