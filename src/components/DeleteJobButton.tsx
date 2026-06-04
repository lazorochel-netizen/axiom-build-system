'use client'

import { deleteJob } from '@/actions/jobs'

export default function DeleteJobButton({ vehicleId }: { vehicleId: string }) {
  return (
    <form
      action={deleteJob}
      onSubmit={e => {
        if (!confirm('Delete this job? This cannot be undone.')) e.preventDefault()
      }}
    >
      <input type="hidden" name="vehicle_id" value={vehicleId} />
      <button
        type="submit"
        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 transition-colors"
      >
        Delete Job
      </button>
    </form>
  )
}
