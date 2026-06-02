'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="mt-8 bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors print:hidden"
    >
      Print QR Code
    </button>
  )
}
