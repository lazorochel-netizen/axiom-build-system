import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function FitterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await (supabase.from('users') as any)
    .select('name, role')
    .eq('id', user.id)
    .single() as { data: { name?: string; role: string } | null }

  if (profile?.role !== 'fitter') redirect('/login')

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <img src="/axiom-logo.png" alt="Axiom Group" className="h-9 w-auto" />
        <div className="flex items-center gap-3">
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
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5">
        {children}
      </main>
    </div>
  )
}
