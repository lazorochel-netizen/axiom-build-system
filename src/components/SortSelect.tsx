'use client'

export default function SortSelect({
  value,
  options,
  baseUrl,
}: {
  value: string
  options: { value: string; label: string }[]
  baseUrl: string  // current URL without sort param — sort will be appended
}) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    const url = new URL(baseUrl, window.location.origin)
    if (val && val !== options[0].value) {
      url.searchParams.set('sort', val)
    } else {
      url.searchParams.delete('sort')
    }
    window.location.href = url.toString()
  }

  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={handleChange}
        className="appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▼</span>
    </div>
  )
}
