'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SalesNav() {
  const pathname = usePathname()

  const links = [
    { href: '/sales/dashboard', label: 'Pipeline' },
    { href: '/sales/leads/new', label: '+ New Lead' },
  ]

  return (
    <nav className="bg-white border-b border-slate-200 px-4">
      <div className="max-w-5xl mx-auto flex gap-1">
        {links.map(link => {
          const active = link.href === '/sales/leads/new'
            ? pathname === link.href
            : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? 'border-[#5B2D8E] text-[#5B2D8E]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
