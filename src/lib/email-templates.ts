/**
 * Shared email HTML builders — used by both the send action and the preview page.
 */

export const STATUS_LABELS: Record<string, string> = {
  pending:               'Build Pending',
  kit_designing:         'Kit Being Designed',
  kit_production:        'Kit In Production',
  kit_dispatched:        'Kit Dispatched',
  in_progress:           'Build In Progress',
  waiting_on_parts:      'Waiting for Parts',
  waiting_on_compliance: 'In Compliance Review',
  completed:             'Build Complete',
  delivered:             'Delivered',
}

function baseTemplate(body: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif">
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827">
        <div style="background:#1e40af;padding:20px 24px;border-radius:8px 8px 0 0">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:700">Axiom Group Australia</p>
        </div>
        <div style="padding:24px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          ${body}
        </div>
        <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:12px">
          Axiom Build System — automated notification
        </p>
      </div>
    </body>
    </html>
  `
}

export function buildCustomerUpdateHtml({
  customerName,
  jobId,
  vehicleYear,
  vehicleMake,
  vehicleModel,
  buildStatus,
  customMessage,
  portalUrl,
  workshopPhone,
}: {
  customerName: string
  jobId: string
  vehicleYear: number | null
  vehicleMake: string
  vehicleModel: string
  buildStatus: string
  customMessage: string | null
  portalUrl: string
  workshopPhone?: string | null
}) {
  const vehicle     = `${vehicleYear ?? ''} ${vehicleMake} ${vehicleModel}`.trim()
  const statusLabel = STATUS_LABELS[buildStatus] ?? buildStatus.replace(/_/g, ' ')
  const statusColour =
    buildStatus === 'completed' || buildStatus === 'delivered' ? '#166534' :
    buildStatus.startsWith('kit_') ? '#92400e' :
    buildStatus === 'in_progress' ? '#1e40af' : '#374151'

  const body = `
    <p style="font-size:16px;font-weight:600;margin:0 0 4px">Hi ${customerName},</p>
    <p style="font-size:14px;color:#6b7280;margin:0 0 20px">Here's the latest update on your vehicle build.</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr><td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px;color:#6b7280;width:130px">Vehicle</td>
          <td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px;font-weight:600">${vehicle}</td></tr>
      <tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px;color:#6b7280">Job</td>
          <td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px">${jobId}</td></tr>
      <tr><td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px;color:#6b7280">Current Status</td>
          <td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px;font-weight:700;color:${statusColour}">${statusLabel}</td></tr>
    </table>

    ${customMessage ? `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px 16px;margin-bottom:20px">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Message from Axiom</p>
      <p style="margin:0;font-size:14px;color:#111827;white-space:pre-line">${customMessage}</p>
    </div>` : ''}

    <p style="font-size:13px;color:#6b7280;margin:0 0 16px">
      You can view your full build progress, photos, and status updates anytime on your personal portal:
    </p>

    <a href="${portalUrl}"
      style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
      View Your Build Progress →
    </a>

    ${workshopPhone ? `
    <p style="font-size:12px;color:#9ca3af;margin-top:20px">
      Questions? Contact us at
      <a href="tel:${workshopPhone}" style="color:#1e40af">${workshopPhone}</a>
    </p>` : ''}
  `

  return baseTemplate(body)
}
