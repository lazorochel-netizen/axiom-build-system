import { createClient as createRawClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { updateLeadStage, updateLead, convertLeadToJob } from '@/actions/leads'
import type { Lead, LeadStage, LeadSource } from '@/types/database'

const BUILD_TYPES = [
  'Hiace SLWB', 'Hiace LWB', 'Hiace LWB High Roof', 'Axiom 30', 'Axiom 20',
]

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'website',   label: 'Website enquiry' },
  { value: 'phone',     label: 'Phone call' },
  { value: 'walk_in',   label: 'Walk-in' },
  { value: 'referral',  label: 'Referral' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'google',    label: 'Google' },
  { value: 'other',     label: 'Other' },
]

const STAGES: { key: LeadStage; label: string; colour: string }[] = [
  { key: 'new',       label: 'New',       colour: 'bg-slate-100 text-slate-600' },
  { key: 'contacted', label: 'Contacted', colour: 'bg-blue-100 text-blue-700' },
  { key: 'qualified', label: 'Qualified', colour: 'bg-purple-100 text-purple-700' },
  { key: 'quoted',    label: 'Quoted',    colour: 'bg-yellow-100 text-yellow-700' },
  { key: 'won',       label: 'Won',       colour: 'bg-green-100 text-green-700' },
  { key: 'lost',      label: 'Lost',      colour: 'bg-red-100 text-red-700' },
]

const PIPELINE_STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'quoted']

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams

  const admin = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: raw } = await admin.from('leads').select('*').eq('id', id).single()
  if (!raw) notFound()
  const lead = raw as Lead

  const stage = STAGES.find(s => s.key === lead.stage)
  const isActive = PIPELINE_STAGES.includes(lead.stage)
  const canConvert = lead.stage === 'quoted' || lead.stage === 'qualified'
  const isWon = lead.stage === 'won'

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back */}
      <Link href="/sales/dashboard" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
        ← Pipeline
      </Link>

      {error && (
        <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠ {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{lead.customer_name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {[lead.vehicle_year, lead.vehicle_make, lead.vehicle_model].filter(Boolean).join(' ')}
            {lead.build_type && ` · ${lead.build_type}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lead.temperature && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              lead.temperature === 'warm'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-blue-50 text-blue-500'
            }`}>
              {lead.temperature === 'warm' ? '🔥 Warm' : '❄️ Cold'}
            </span>
          )}
          {stage && (
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${stage.colour}`}>
              {stage.label}
            </span>
          )}
        </div>
      </div>

      {/* Won banner */}
      {isWon && lead.converted_vehicle_id && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <p className="text-sm font-semibold text-green-800">✓ Converted to job</p>
          <p className="text-sm text-green-700 mt-0.5">
            This lead was won on{' '}
            {lead.converted_at && new Date(lead.converted_at).toLocaleDateString('en-AU', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}.
          </p>
          <Link
            href={`/ops/jobs/${lead.converted_vehicle_id}`}
            className="inline-block mt-2 text-sm font-medium text-green-700 underline"
          >
            View job in Ops →
          </Link>
        </div>
      )}

      {/* Stage progression (active leads only) */}
      {isActive && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-700 mb-3">Move Stage</p>
          <div className="flex gap-2 flex-wrap">
            {PIPELINE_STAGES.map(s => {
              const info = STAGES.find(x => x.key === s)!
              const isCurrent = lead.stage === s
              return (
                <form key={s} action={updateLeadStage}>
                  <input type="hidden" name="id" value={lead.id} />
                  <input type="hidden" name="stage" value={s} />
                  <button
                    type="submit"
                    disabled={isCurrent}
                    className={`text-sm font-medium px-4 py-1.5 rounded-full border transition-colors ${
                      isCurrent
                        ? `${info.colour} border-transparent cursor-default`
                        : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {info.label}
                  </button>
                </form>
              )
            })}
            {/* Mark Lost */}
            <form action={updateLeadStage}>
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="stage" value="lost" />
              <button
                type="submit"
                className="text-sm font-medium px-4 py-1.5 rounded-full border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                Mark Lost
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lost — allow re-activating */}
      {lead.stage === 'lost' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-3">This lead is marked lost. Re-activate it below.</p>
          <form action={updateLeadStage}>
            <input type="hidden" name="id" value={lead.id} />
            <input type="hidden" name="stage" value="contacted" />
            <button
              type="submit"
              className="text-sm font-medium bg-[#5B2D8E] hover:bg-[#4A2478] text-white px-4 py-2 rounded-lg transition-colors"
            >
              Re-activate Lead
            </button>
          </form>
        </div>
      )}

      {/* Convert to Job */}
      {canConvert && (
        <div className="bg-[#F3EEF9] border border-purple-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-[#4A2478] mb-1">Ready to convert?</p>
          <p className="text-sm text-purple-700 mb-3">
            This will create a job in the Ops system using the lead's details. You'll be taken to the new job page.
          </p>
          <form action={convertLeadToJob}>
            <input type="hidden" name="lead_id" value={lead.id} />
            <button
              type="submit"
              className="bg-[#5B2D8E] hover:bg-[#4A2478] text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              Convert to Job →
            </button>
          </form>
        </div>
      )}

      {/* Edit lead details */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">Lead Details</p>
        </div>
        <form action={updateLead} className="px-5 py-5 space-y-4">
          <input type="hidden" name="id" value={lead.id} />

          <section className="space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</p>
            <Field label="Full Name *" name="customer_name" defaultValue={lead.customer_name} required />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone" name="customer_phone" defaultValue={lead.customer_phone ?? ''} />
              <Field label="Email" name="customer_email" type="email" defaultValue={lead.customer_email ?? ''} />
            </div>
          </section>

          <section className="space-y-4 pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vehicle & Build</p>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Make" name="vehicle_make" defaultValue={lead.vehicle_make ?? ''} />
              <Field label="Model" name="vehicle_model" defaultValue={lead.vehicle_model ?? ''} />
              <Field label="Year" name="vehicle_year" type="number" defaultValue={lead.vehicle_year?.toString() ?? ''} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Build Type</label>
              <select
                name="build_type"
                defaultValue={lead.build_type ?? ''}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]"
              >
                <option value="">Select…</option>
                {BUILD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </section>

          <section className="space-y-4 pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Deal Info</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
                <select
                  name="source"
                  defaultValue={lead.source}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]"
                >
                  {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <Field label="Budget" name="budget" defaultValue={lead.budget ?? ''} placeholder="e.g. $20k–$25k" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                name="notes"
                rows={3}
                defaultValue={lead.notes ?? ''}
                placeholder="Running notes — updates, objections, next steps…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E] resize-none"
              />
            </div>
          </section>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="bg-[#5B2D8E] hover:bg-[#4A2478] text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>

      <p className="text-xs text-slate-400 text-right">
        Added {new Date(lead.created_at).toLocaleDateString('en-AU', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
        {' · '}Updated {new Date(lead.updated_at).toLocaleDateString('en-AU', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
      </p>
    </div>
  )
}

function Field({
  label, name, defaultValue = '', placeholder, type = 'text', required = false,
}: {
  label: string; name: string; defaultValue?: string; placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]"
      />
    </div>
  )
}
