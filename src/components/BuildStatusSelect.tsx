'use client'

import { useState, useTransition } from 'react'
import { updateBuildStatus } from '@/actions/jobs'

const STATUSES = [
  { value: 'pending',                label: 'Pending' },
  { value: 'kit_designing',          label: 'Kit: Designing' },
  { value: 'kit_production',         label: 'Kit: In Production' },
  { value: 'kit_dispatched',         label: 'Kit: Dispatched' },
  { value: 'in_progress',            label: 'In Progress' },
  { value: 'waiting_on_parts',       label: 'Waiting for Kit' },
  { value: 'waiting_on_compliance',  label: 'In Compliance' },
  { value: 'completed',              label: 'Completed' },
  { value: 'delivered',              label: 'Delivered' },
]

const STATUS_COLOURS: Record<string, string> = {
  pending:               'bg-slate-100 text-slate-600',
  kit_designing:         'bg-orange-100 text-orange-700',
  kit_production:        'bg-orange-100 text-orange-700',
  kit_dispatched:        'bg-yellow-100 text-yellow-700',
  in_progress:           'bg-blue-100 text-[#4A2478]',
  waiting_on_parts:      'bg-amber-100 text-amber-700',
  waiting_on_compliance: 'bg-purple-100 text-purple-700',
  completed:             'bg-green-100 text-green-700',
  delivered:             'bg-slate-200 text-slate-500',
}

export default function BuildStatusSelect({
  vehicleId,
  currentStatus,
}: {
  vehicleId: string
  currentStatus: string
}) {
  const [status, setStatus]   = useState(currentStatus)
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    setStatus(next)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('vehicle_id',   vehicleId)
      fd.set('build_status', next)
      await updateBuildStatus(fd)
    })
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={isPending}
      className={`text-xs font-medium px-2.5 py-1.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5B2D8E] ${STATUS_COLOURS[status] ?? STATUS_COLOURS.pending}`}
    >
      {STATUSES.map(s => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  )
}
