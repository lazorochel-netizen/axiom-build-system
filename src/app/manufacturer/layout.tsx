import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ManufacturerLayout({
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

  if (profile?.role !== 'manufacturer') redirect('/login')

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <img src="/axiom-logo.png" alt="Axiom Group" className="h-9 w-auto" />
          <span className="ml-2 text-xs font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Manufacturer Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{profile.name}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}
