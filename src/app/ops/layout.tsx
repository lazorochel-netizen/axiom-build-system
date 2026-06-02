import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'operations_manager') redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Nav */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-slate-900">Axiom Build System</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">{profile.name}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Side Nav + Content */}
      <div className="flex flex-1">
        <nav className="hidden md:flex flex-col gap-1 w-52 border-r border-slate-200 bg-white px-3 py-4 shrink-0">
          <NavLink href="/ops/dashboard">Dashboard</NavLink>
          <NavLink href="/ops/jobs">Jobs</NavLink>
          <NavLink href="/ops/jobs/new">New Job</NavLink>
          <NavLink href="/ops/customers">Customers</NavLink>
          <NavLink href="/ops/quotations">Quotations</NavLink>
          <NavLink href="/ops/invoices">Invoices</NavLink>
          <div className="my-1 border-t border-slate-100" />
          <NavLink href="/ops/fitters">Staff</NavLink>
        </nav>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
    >
      {children}
    </a>
  )
}
