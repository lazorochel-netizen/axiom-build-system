import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Route protection rules:
 *
 *  /ops/**          → requires login + role = operations_manager
 *  /fitter/**       → requires login + role = fitter
 *  /manufacturer/** → requires login + role = manufacturer
 *  /job/[token]     → public (token-based, no login required)
 *  /portal/[token]  → public (token-based, no login required)
 *  /login           → redirects to role dashboard if already logged in
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Public routes — allow through without auth
  if (
    pathname.startsWith('/job/') ||
    pathname.startsWith('/portal/') ||
    pathname.startsWith('/login')
  ) {
    // Redirect logged-in users away from /login to their role dashboard
    if (pathname === '/login' && user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      let dest = '/login'
      if (profile?.role === 'fitter') dest = '/fitter/dashboard'
      else if (profile?.role === 'manufacturer') dest = '/manufacturer/dashboard'
      else if (profile?.role === 'operations_manager') dest = '/ops/dashboard'

      // Only redirect if we have a known role — avoids loop on unknown/null role
      if (dest !== '/login') {
        return NextResponse.redirect(new URL(dest, request.url))
      }
    }
    return supabaseResponse
  }

  // Protected routes — require auth
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Fetch user role from the database
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // Ops routes — operations_manager only
  if (pathname.startsWith('/ops') && role !== 'operations_manager') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Fitter routes — fitter only
  if (pathname.startsWith('/fitter') && role !== 'fitter') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Manufacturer routes — manufacturer only
  if (pathname.startsWith('/manufacturer') && role !== 'manufacturer') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export default middleware

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
