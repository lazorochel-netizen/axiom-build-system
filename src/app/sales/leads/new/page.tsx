import { createLead } from '@/actions/leads'

const BUILD_TYPES = [
  'Hiace SLWB',
  'Hiace LWB',
  'Hiace LWB High Roof',
  'Axiom 30',
  'Axiom 20',
]

const SOURCES = [
  { value: 'website',   label: 'Website enquiry' },
  { value: 'phone',     label: 'Phone call' },
  { value: 'walk_in',   label: 'Walk-in' },
  { value: 'referral',  label: 'Referral' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'google',    label: 'Google' },
  { value: 'other',     label: 'Other' },
]

export default async function NewLeadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">New Lead</h1>

      {error && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠ {error}
        </div>
      )}

      <form action={createLead} className="space-y-6">

        {/* Contact */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Contact Details</h2>
          <Field label="Full Name *" name="customer_name" placeholder="e.g. James Smith" required />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone" name="customer_phone" placeholder="e.g. 0412 345 678" />
            <Field label="Email" name="customer_email" type="email" placeholder="Optional" />
          </div>
        </section>

        {/* Vehicle interest */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Vehicle & Build Interest</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Make" name="vehicle_make" placeholder="e.g. Toyota" />
            <Field label="Model" name="vehicle_model" placeholder="e.g. Hiace" />
            <Field label="Year" name="vehicle_year" placeholder="e.g. 2024" type="number" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Build Type</label>
            <select
              name="build_type"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]"
            >
              <option value="">Select build type…</option>
              {BUILD_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Deal info */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Deal Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lead Source *</label>
              <select
                name="source"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]"
              >
                <option value="">Select source…</option>
                {SOURCES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <Field label="Budget" name="budget" placeholder="e.g. $20k–$25k" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              name="notes"
              rows={3}
              placeholder="e.g. Interested in solar upgrade. Wants delivery before Christmas."
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E] resize-none"
            />
          </div>
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-[#5B2D8E] hover:bg-[#4A2478] text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Save Lead
          </button>
          <a
            href="/sales/dashboard"
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}

function Field({
  label, name, placeholder, type = 'text', required = false,
}: {
  label: string; name: string; placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]"
      />
    </div>
  )
}
