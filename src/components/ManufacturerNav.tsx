'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function ManufacturerNav() {
  const pathname = usePathname()
  const isBackorders = pathname.startsWith('/manufacturer/backorders')

  return (
    <nav className="bg-white border-b border-slate-200 px-4">
      <div className="max-w-4xl mx-auto flex gap-1">
        <Link
          href="/manufacturer/dashboard"
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            !isBackorders
              ? 'border-[#5B2D8E] text-[#5B2D8E]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Kit Orders
        </Link>
        <Link
          href="/manufacturer/backorders"
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            isBackorders
              ? 'border-[#5B2D8E] text-[#5B2D8E]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Back Orders
        </Link>
      </div>
    </nav>
  )
}
