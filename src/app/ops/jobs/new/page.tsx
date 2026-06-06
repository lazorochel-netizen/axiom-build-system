import { createJob } from '@/actions/jobs'

const BUILD_TYPES = [
  { label: 'Toyota Hiace — SLWB ($19,999)',          value: 'Hiace SLWB' },
  { label: 'Toyota Hiace — LWB ($15,999)',            value: 'Hiace LWB' },
  { label: 'Toyota Hiace — LWB High Roof ($17,999)', value: 'Hiace LWB High Roof' },
  { label: 'Axiom 30 — Toyota Estima',               value: 'Axiom 30' },
  { label: 'Axiom 20 — Nissan Elgrand',              value: 'Axiom 20' },
]

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const pre = {
    customer:   params.customer   ?? '',
    make:       params.make       ?? '',
    model:      params.model      ?? '',
    rego:       params.rego       ?? '',
    build_type: params.build_type ?? '',
  }
  const error = params.error ?? null

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">New Job</h1>

      {error && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠ {error}
        </div>
      )}

      {pre.customer && (
        <div className="mb-4 px-4 py-2.5 bg-[#F3EEF9] border border-blue-200 rounded-lg text-sm text-[#4A2478]">
          Pre-filled from Build Log Sheet — review and confirm before creating.
        </div>
      )}

      <form action={createJob} className="space-y-8">

        {/* Vehicle Details */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Vehicle Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Make *" name="vehicle_make" placeholder="e.g. Toyota" required defaultValue={pre.make} />
            <Field label="Model *" name="vehicle_model" placeholder="e.g. Hiace" required defaultValue={pre.model} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Year" name="vehicle_year" placeholder="e.g. 2024" type="number" />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Build Type *
              </label>
              <select
                name="build_type"
                required
                defaultValue={pre.build_type}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]"
              >
                <option value="">Select build type…</option>
                {BUILD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="VIN" name="vin" placeholder="Optional" />
            <Field label="Stock Number" name="stock_number" placeholder="Optional" />
            <Field label="Registration" name="registration" placeholder="Optional" defaultValue={pre.rego} />
          </div>

          <Field
            label="Estimated Completion Date"
            name="estimated_completion_date"
            type="date"
          />
        </section>

        {/* Customer Details */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Customer Details</h2>

          <Field label="Customer Name *" name="customer_name" placeholder="Full name" required defaultValue={pre.customer} />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" name="customer_email" type="email" placeholder="Optional" />
            <Field label="Phone" name="customer_phone" placeholder="Optional" />
          </div>
        </section>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-[#5B2D8E] hover:bg-[#4A2478] text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Create Job
          </button>
          <a
            href="/ops/dashboard"
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
  label, name, placeholder, type = 'text', required = false, defaultValue = '',
}: {
  label: string
  name: string
  placeholder?: string
  type?: string
  required?: boolean
  defaultValue?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]"
      />
    </div>
  )
}
