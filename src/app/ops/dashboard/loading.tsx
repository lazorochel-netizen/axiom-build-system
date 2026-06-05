export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-5xl animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 bg-slate-200 rounded-lg" />
        <div className="h-9 w-24 bg-slate-200 rounded-lg" />
      </div>
      {/* Status tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="h-8 w-10 bg-slate-200 rounded" />
            <div className="h-3 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
      {/* Job rows */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div className="space-y-1.5">
              <div className="h-4 w-48 bg-slate-200 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
            <div className="h-6 w-20 bg-slate-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
