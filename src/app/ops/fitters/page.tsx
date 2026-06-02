import { createClient } from '@/lib/supabase/server'
import { createStaff } from '@/actions/fitters'

const ROLE_BADGE: Record<string, string> = {
  operations_manager: 'bg-purple-100 text-purple-700',
  fitter:             'bg-cyan-100 text-cyan-700',
}

const ROLE_LABEL: Record<string, string> = {
  operations_manager: 'Ops Manager',
  fitter:             'Fitter',
}

export default async function FittersPage() {
  const supabase = await createClient()

  const { data: staff } = await supabase
    .from('users')
    .select('id, name, email, role, created_at')
    .order('role')
    .order('name')

  const managers = staff?.filter(s => s.role === 'operations_manager') ?? []
  const fitters  = staff?.filter(s => s.role === 'fitter') ?? []

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-xl font-semibold text-slate-900">Staff</h1>

      {/* Ops Managers */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Operations Managers</h2>
        {managers.length > 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {managers.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.email}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_BADGE[s.role]}`}>
                  {ROLE_LABEL[s.role]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No ops managers added yet.</p>
        )}
      </section>

      {/* Fitters */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Fitters</h2>
        {fitters.length > 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {fitters.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.email}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_BADGE[s.role]}`}>
                  {ROLE_LABEL[s.role]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No fitters added yet.</p>
        )}
      </section>

      {/* Add Staff Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Add New Staff Member</h2>

        <form action={createStaff} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input
                name="name"
                required
                placeholder="e.g. Jake Smith"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input
                name="email"
                type="email"
                required
                placeholder="jake@axiomgroup.com.au"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password *</label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
              <select
                name="role"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fitter">Fitter</option>
                <option value="operations_manager">Operations Manager</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  )
}
