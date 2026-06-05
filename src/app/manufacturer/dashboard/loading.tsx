export default function ManufacturerLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-1">
        <div className="h-7 w-36 bg-slate-200 rounded-lg" />
        <div className="h-4 w-72 bg-slate-100 rounded" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="h-5 w-48 bg-slate-200 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
            <div className="h-6 w-28 bg-slate-100 rounded-full" />
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-9 bg-slate-100 rounded-lg" />
              <div className="h-9 bg-blue-100 rounded-lg" />
            </div>
            <div className="h-16 bg-slate-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
