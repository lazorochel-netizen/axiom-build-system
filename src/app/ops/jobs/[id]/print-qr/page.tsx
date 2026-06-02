import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PrintButton from './PrintButton'

/**
 * Printable QR code page for a job.
 * Open this page and Ctrl+P to print the QR label.
 */
export default async function PrintQRPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('job_id, vehicle_make, vehicle_model, vehicle_year, build_type, qr_codes(token, is_active)')
    .eq('id', id)
    .single()

  if (!vehicle) notFound()

  const activeQR = (vehicle.qr_codes as { token: string; is_active: boolean }[])
    ?.find(q => q.is_active)

  if (!activeQR) {
    return (
      <div className="p-8 text-center text-slate-500">
        No active QR code found for this job.{' '}
        <a href={`/ops/jobs/${id}`} className="text-blue-600 underline">Go back</a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 print:p-4">
      {/* Back link — hidden when printing */}
      <a
        href={`/ops/jobs/${id}`}
        className="mb-8 text-sm text-slate-400 hover:text-slate-600 print:hidden"
      >
        ← Back to job
      </a>

      {/* QR Label */}
      <div className="border-2 border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-4 w-72 print:border-black print:rounded-none">
        {/* QR Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/qr/${activeQR.token}`}
          alt={`QR code for ${vehicle.job_id}`}
          width={220}
          height={220}
          className="rounded-lg"
        />

        {/* Job Info */}
        <div className="text-center">
          <p className="text-lg font-bold text-slate-900">{vehicle.job_id}</p>
          <p className="text-sm text-slate-600 mt-0.5">
            {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
          </p>
          <p className="text-xs text-slate-400 mt-1">{vehicle.build_type}</p>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Scan to view build progress
        </p>
      </div>

      <PrintButton />
    </div>
  )
}
