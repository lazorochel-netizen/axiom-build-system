import { createJob } from '@/actions/jobs'

const BUILD_TYPES = [
  { label: 'Toyota Hiace — SLWB ($19,999)',          value: 'Hiace SLWB' },
  { label: 'Toyota Hiace — LWB ($15,999)',            value: 'Hiace LWB' },
  { label: 'Toyota Hiace — LWB High Roof ($17,999)', value: 'Hiace LWB High Roof' },
  { label: 'Axiom 30 — Toyota Estima',               value: 'Axiom 30' },
  { label: 'Axiom 20 — Nissan Elgrand',              value: 'Axiom 20' },
]

export default function NewJobPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">New Job</h1>

      <form action={createJob} className="space-y-8">

        {/* Vehicle Details */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Vehicle Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Make *" name="vehicle_make" placeholder="e.g. Jayco" required />
            <Field label="Model *" name="vehicle_model" placeholder="e.g. Journey" required />
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <Field label="Registration" name="registration" placeholder="Optional" />
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

          <Field label="Customer Name *" name="customer_name" placeholder="Full name" required />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" name="customer_email" type="email" placeholder="Optional" />
            <Field label="Phone" name="customer_phone" placeholder="Optional" />
          </div>
        </section>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors"
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
  label, name, placeholder, type = 'text', required = false,
}: {
  label: string
  name: string
  placeholder?: string
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
