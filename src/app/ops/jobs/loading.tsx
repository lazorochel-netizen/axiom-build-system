export default function JobsLoading() {
  return (
    <div className="max-w-4xl space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 bg-slate-200 rounded-lg" />
        <div className="h-9 w-24 bg-slate-200 rounded-lg" />
      </div>
      {/* Filter pills */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-20 bg-slate-100 rounded-full" />
        ))}
      </div>
      {/* Search bar */}
      <div className="h-10 w-full bg-slate-100 rounded-lg" />
      {/* Job list */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3.5">
            <div className="space-y-1.5">
              <div className="h-4 w-52 bg-slate-200 rounded" />
              <div className="h-3 w-36 bg-slate-100 rounded" />
            </div>
            <div className="h-6 w-24 bg-slate-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
