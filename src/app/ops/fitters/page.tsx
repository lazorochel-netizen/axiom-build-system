import { createClient } from '@/lib/supabase/server'
import { createFitter } from '@/actions/fitters'

export default async function FittersPage() {
  const supabase = await createClient()

  const { data: fitters } = await supabase
    .from('users')
    .select('id, name, email, created_at')
    .eq('role', 'fitter')
    .order('name')

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Fitters</h1>

      {/* Fitter List */}
      {fitters && fitters.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {fitters.map(f => (
            <div key={f.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{f.name}</p>
                <p className="text-xs text-slate-400">{f.email}</p>
              </div>
              <span className="text-xs bg-cyan-100 text-cyan-700 font-medium px-2.5 py-1 rounded-full">
                Fitter
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">No fitters added yet.</p>
      )}

      {/* Add Fitter Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Add New Fitter</h2>

        <form action={createFitter} className="space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Temporary Password *
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Min. 8 characters — fitter can change this after login"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            The fitter will log in at <strong>localhost:3001/login</strong> (or your live URL once deployed) using this email and password.
          </div>

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Create Fitter Account
          </button>
        </form>
      </div>
    </div>
  )
}
