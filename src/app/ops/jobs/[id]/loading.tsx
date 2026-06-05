export default function JobDetailLoading() {
  return (
    <div className="max-w-3xl space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="h-7 w-64 bg-slate-200 rounded-lg" />
          <div className="h-4 w-40 bg-slate-100 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-slate-100 rounded-full" />
          <div className="h-8 w-20 bg-red-100 rounded-lg" />
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex px-4 py-3 gap-3">
            <div className="h-4 w-32 bg-slate-100 rounded shrink-0" />
            <div className="h-4 w-48 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <div className="flex justify-between">
          <div className="h-4 w-24 bg-slate-100 rounded" />
          <div className="h-4 w-12 bg-slate-100 rounded" />
        </div>
        <div className="h-2 bg-slate-100 rounded-full" />
      </div>

      {/* Tasks */}
      <div className="space-y-1">
        <div className="h-5 w-16 bg-slate-100 rounded mb-3" />
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-1.5">
                <div className="h-4 w-56 bg-slate-200 rounded" />
                <div className="h-3 w-28 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-20 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
