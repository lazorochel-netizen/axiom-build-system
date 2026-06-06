/**
 * Axiom Build System — Email Notifications via Resend
 *
 * Setup:
 * 1. Sign up at https://resend.com (free tier: 3,000 emails/month)
 * 2. Add a verified domain (or use onboarding@resend.dev for testing)
 * 3. Create an API key
 * 4. Add to Vercel env vars:
 *      RESEND_API_KEY=re_xxxxxxxx
 *      EMAIL_FROM=builds@yourdomain.com.au
 *      EMAIL_OPS=ops@yourdomain.com.au   (ops manager inbox for alerts)
 * 5. npm install resend  (run once in your project folder)
 */

import { Resend } from 'resend'

const FROM = process.env.EMAIL_FROM ?? 'Axiom Builds <builds@axiomgroup.com.au>'
const OPS  = process.env.EMAIL_OPS  ?? ''

// ─── Helper — lazy client so module load never throws at build time ───────────
async function send(to: string | string[], subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return
  }
  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch {
    // Never throw — email failures should not break the main action
  }
}

// ─── Email Templates ─────────────────────────────────────────────────────────

function baseTemplate(body: string) {
  return `
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
  `
}

// ─── Notification: Fitter assigned to a job ───────────────────────────────────
export async function emailFitterAssigned({
  fitterEmail,
  fitterName,
  jobId,
  vehicleYear,
  vehicleMake,
  vehicleModel,
  buildType,
  jobUrl,
}: {
  fitterEmail: string
  fitterName: string
  jobId: string
  vehicleYear: number | null
  vehicleMake: string
  vehicleModel: string
  buildType: string
  jobUrl: string
}) {
  const vehicle = `${vehicleYear ?? ''} ${vehicleMake} ${vehicleModel}`.trim()
  await send(
    fitterEmail,
    `You've been assigned to ${jobId}`,
    baseTemplate(`
      <p style="font-size:16px;font-weight:600;margin:0 0 12px">Hi ${fitterName},</p>
      <p style="margin:0 0 16px;color:#374151">You've been assigned to a new build job.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr><td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px;color:#6b7280;width:120px">Job</td>
            <td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px;font-weight:600">${jobId}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px;color:#6b7280">Vehicle</td>
            <td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px">${vehicle}</td></tr>
        <tr><td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px;color:#6b7280">Build Type</td>
            <td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px">${buildType}</td></tr>
      </table>
      <a href="${jobUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
        View Job →
      </a>
    `)
  )
}

// ─── Notification: All tasks complete (ops alert) ─────────────────────────────
export async function emailAllTasksComplete({
  jobId,
  vehicleYear,
  vehicleMake,
  vehicleModel,
  jobUrl,
}: {
  jobId: string
  vehicleYear: number | null
  vehicleMake: string
  vehicleModel: string
  jobUrl: string
}) {
  if (!OPS) return
  const vehicle = `${vehicleYear ?? ''} ${vehicleMake} ${vehicleModel}`.trim()
  await send(
    OPS,
    `✓ All tasks complete — ${jobId}`,
    baseTemplate(`
      <p style="font-size:16px;font-weight:600;margin:0 0 12px">All tasks complete</p>
      <p style="margin:0 0 16px;color:#374151">
        All tasks for <strong>${jobId} — ${vehicle}</strong> have been marked complete.
        The job is ready for QC inspection and status update.
      </p>
      <a href="${jobUrl}" style="display:inline-block;background:#166534;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
        Review Job →
      </a>
    `)
  )
}

// ─── Notification: Job status changed (customer alert) ────────────────────────
export async function emailCustomerStatusUpdate({
  customerEmail,
  customerName,
  jobId,
  vehicleYear,
  vehicleMake,
  vehicleModel,
  status,
  portalUrl,
}: {
  customerEmail: string
  customerName: string
  jobId: string
  vehicleYear: number | null
  vehicleMake: string
  vehicleModel: string
  status: string
  portalUrl: string
}) {
  const vehicle = `${vehicleYear ?? ''} ${vehicleMake} ${vehicleModel}`.trim()
  const statusMessages: Record<string, { subject: string; body: string }> = {
    in_progress: {
      subject: `Your build has started — ${jobId}`,
      body: 'Great news — your vehicle build is now underway! We\'ll keep your portal updated as each stage is completed.',
    },
    waiting_on_parts: {
      subject: `Parts update for ${jobId}`,
      body: 'We\'re currently waiting on parts to arrive before continuing your build. We\'ll update you as soon as work resumes.',
    },
    waiting_on_compliance: {
      subject: `Compliance check update — ${jobId}`,
      body: 'Your vehicle is currently going through its compliance checks. This is the final stage before handover.',
    },
    completed: {
      subject: `Your build is complete — ${jobId}`,
      body: 'Exciting news — your vehicle build is complete! Our team will be in touch shortly to arrange handover.',
    },
    delivered: {
      subject: `Your vehicle has been delivered — ${jobId}`,
      body: 'Your vehicle has been delivered. Thank you for choosing Axiom Group Australia. We hope you enjoy the adventure!',
    },
  }

  const message = statusMessages[status]
  if (!message) return  // Don't email for 'pending'

  await send(
    customerEmail,
    message.subject,
    baseTemplate(`
      <p style="font-size:16px;font-weight:600;margin:0 0 12px">Hi ${customerName},</p>
      <p style="margin:0 0 16px;color:#374151">${message.body}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr><td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px;color:#6b7280;width:120px">Job</td>
            <td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px;font-weight:600">${jobId}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px;color:#6b7280">Vehicle</td>
            <td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px">${vehicle}</td></tr>
      </table>
      <a href="${portalUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
        View Your Build Progress →
      </a>
    `)
  )
}

// ─── Notification: Job created (ops confirmation) ─────────────────────────────
export async function emailJobCreated({
  jobId,
  vehicleYear,
  vehicleMake,
  vehicleModel,
  buildType,
  customerName,
  jobUrl,
}: {
  jobId: string
  vehicleYear: number | null
  vehicleMake: string
  vehicleModel: string
  buildType: string
  customerName: string
  jobUrl: string
}) {
  if (!OPS) return
  const vehicle = `${vehicleYear ?? ''} ${vehicleMake} ${vehicleModel}`.trim()
  await send(
    OPS,
    `New job created — ${jobId}`,
    baseTemplate(`
      <p style="font-size:16px;font-weight:600;margin:0 0 12px">New job created</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr><td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px;color:#6b7280;width:120px">Job ID</td>
            <td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px;font-weight:600">${jobId}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px;color:#6b7280">Customer</td>
            <td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px">${customerName}</td></tr>
        <tr><td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px;color:#6b7280">Vehicle</td>
            <td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px">${vehicle}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px;color:#6b7280">Build Type</td>
            <td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px">${buildType}</td></tr>
      </table>
      <a href="${jobUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
        Open Job →
      </a>
    `)
  )
}

// ─── Manual customer update — sent by ops from the job detail page ────────────
export async function emailManualCustomerUpdate({
  customerEmail,
  customerName,
  jobId,
  vehicleYear,
  vehicleMake,
  vehicleModel,
  buildStatus,
  statusLabel,
  customMessage,
  portalUrl,
}: {
  customerEmail: string
  customerName: string
  jobId: string
  vehicleYear: number | null
  vehicleMake: string
  vehicleModel: string
  buildStatus: string
  statusLabel: string
  customMessage: string | null
  portalUrl: string
}) {
  const vehicle = `${vehicleYear ?? ''} ${vehicleMake} ${vehicleModel}`.trim()

  // Status badge colour
  const statusColour =
    buildStatus === 'completed' || buildStatus === 'delivered' ? '#166534' :
    buildStatus.startsWith('kit_') ? '#92400e' :
    buildStatus === 'in_progress' ? '#1e40af' : '#374151'

  await send(
    customerEmail,
    `Build update for your ${vehicle} — ${jobId}`,
    baseTemplate(`
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

      <p style="font-size:12px;color:#9ca3af;margin-top:20px">
        Questions? Contact us at
        <a href="tel:${process.env.NEXT_PUBLIC_WORKSHOP_PHONE ?? ''}" style="color:#1e40af">
          ${process.env.NEXT_PUBLIC_WORKSHOP_PHONE ?? 'our workshop'}
        </a>
      </p>
    `)
  )
}

// ─── Notification: Kit status updated by manufacturer ─────────────────────────
export async function emailKitStatusChanged({
  jobId,
  vehicleYear,
  vehicleMake,
  vehicleModel,
  status,
  statusLabel,
  notes,
  jobUrl,
}: {
  jobId: string
  vehicleYear: number | null
  vehicleMake: string
  vehicleModel: string
  status: string
  statusLabel: string
  notes: string | null
  jobUrl: string
}) {
  if (!OPS) return
  const vehicle = `${vehicleYear ?? ''} ${vehicleMake} ${vehicleModel}`.trim()
  const statusColour = status === 'dispatched' ? '#166534' : status === 'completed' ? '#1e40af' : '#92400e'

  await send(
    OPS,
    `Kit update: ${statusLabel} — ${jobId}`,
    baseTemplate(`
      <p style="font-size:16px;font-weight:600;margin:0 0 12px">Kit status updated</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr><td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px;color:#6b7280;width:120px">Job</td>
            <td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px;font-weight:600">${jobId}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px;color:#6b7280">Vehicle</td>
            <td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px">${vehicle}</td></tr>
        <tr><td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px;color:#6b7280">Kit Status</td>
            <td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;font-size:13px;font-weight:700;color:${statusColour}">${statusLabel}</td></tr>
        ${notes ? `<tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px;color:#6b7280;vertical-align:top">Notes</td>
            <td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px">${notes}</td></tr>` : ''}
      </table>
      <a href="${jobUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
        View Job →
      </a>
    `)
  )
}
