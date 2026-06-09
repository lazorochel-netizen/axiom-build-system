import { createClient as createRawClient } from '@supabase/supabase-js'
import Link from 'next/link'
import type { Lead, LeadStage } from '@/types/database'

const STAGES: { key: LeadStage; label: string; colour: string }[] = [
  { key: 'new',       label: 'New',       colour: 'bg-slate-100 text-slate-600' },
  { key: 'contacted', label: 'Contacted', colour: 'bg-blue-100 text-blue-700' },
  { key: 'qualified', label: 'Qualified', colour: 'bg-purple-100 text-purple-700' },
  { key: 'quoted',    label: 'Quoted',    colour: 'bg-yellow-100 text-yellow-700' },
  { key: 'won',       label: 'Won',       colour: 'bg-green-100 text-green-700' },
  { key: 'lost',      label: 'Lost',      colour: 'bg-red-100 text-red-700' },
]

const SOURCE_LABELS: Record<string, string> = {
  website:   'Website',
  phone:     'Phone',
  walk_in:   'Walk-in',
  referral:  'Referral',
  instagram: 'Instagram',
  facebook:  'Facebook',
  google:    'Google',
  other:     'Other',
}

export default async function SalesDashboard({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>
}) {
  const { stage: stageFilter } = await searchParams

  const admin = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: raw } = await admin
    .from('leads')
    .select('*')
    .order('updated_at', { ascending: false })

  const allLeads = (raw ?? []) as Lead[]

  // Stage counts (exclude won/lost from summary)
  const stageCounts = STAGES.slice(0, 4).map(s => ({
    ...s,
    count: allLeads.filter(l => l.stage === s.key).length,
  }))

  // Filtered list
  const activeStages: LeadStage[] = ['new', 'contacted', 'qualified', 'quoted']
  const filtered = stageFilter
    ? allLeads.filter(l => l.stage === stageFilter)
    : allLeads.filter(l => activeStages.includes(l.stage))

  const currentStageObj = STAGES.find(s => s.key === stageFilter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Lead Pipeline</h1>
        <Link
          href="/sales/leads/new"
          className="bg-[#5B2D8E] hover:bg-[#4A2478] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Lead
        </Link>
      </div>

      {/* Stage summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stageCounts.map(s => (
          <Link
            key={s.key}
            href={stageFilter === s.key ? '/sales/dashboard' : `/sales/dashboard?stage=${s.key}`}
            className={`bg-white rounded-xl border p-4 transition-all ${
              stageFilter === s.key
                ? 'border-[#5B2D8E] ring-1 ring-[#5B2D8E]'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-2xl font-bold text-slate-900">{s.count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Won / Lost quick links */}
      <div className="flex gap-3">
        {(['won', 'lost'] as LeadStage[]).map(s => {
          const info = STAGES.find(x => x.key === s)!
          const count = allLeads.filter(l => l.stage === s).length
          return (
            <Link
              key={s}
              href={stageFilter === s ? '/sales/dashboard' : `/sales/dashboard?stage=${s}`}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                stageFilter === s
                  ? 'bg-slate-200 text-slate-700 border-slate-300'
                  : `${info.colour} border-transparent`
              }`}
            >
              {info.label} ({count})
            </Link>
          )
        })}
      </div>

      {/* Lead list */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {currentStageObj ? `${currentStageObj.label} leads` : 'Active leads'}
          {filtered.length > 0 && (
            <span className="text-slate-400 font-normal"> ({filtered.length})</span>
          )}
        </h2>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400">
            {stageFilter ? `No ${stageFilter} leads.` : 'No active leads. Add one to get started.'}
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {filtered.map(lead => {
              const stage = STAGES.find(s => s.key === lead.stage)
              return (
                <Link
                  key={lead.id}
                  href={`/sales/leads/${lead.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {lead.customer_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {[lead.vehicle_year, lead.vehicle_make, lead.vehicle_model].filter(Boolean).join(' ')}
                      {lead.build_type && ` · ${lead.build_type}`}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {SOURCE_LABELS[lead.source] ?? lead.source}
                      {lead.budget && ` · ${lead.budget}`}
                      {' · '}
                      {new Date(lead.updated_at).toLocaleDateString('en-AU', {
                        day: 'numeric', month: 'short',
                      })}
                    </p>
                  </div>
                  {stage && (
                    <span className={`shrink-0 ml-3 text-xs font-medium px-2.5 py-1 rounded-full ${stage.colour}`}>
                      {stage.label}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
