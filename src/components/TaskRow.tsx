'use client'

import { useState } from 'react'
import { updateTask } from '@/actions/tasks'

type Task = {
  id: string
  task_name: string
  task_category: string
  status: string
  assigned_to: string | null
}

type Fitter = {
  id: string
  name: string
}

const STATUS_COLOURS: Record<string, string> = {
  pending:     'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-green-100 text-green-700',
}

export default function TaskRow({
  task,
  vehicleId,
  fitters,
}: {
  task: Task
  vehicleId: string
  fitters: Fitter[]
}) {
  const [open, setOpen]           = useState(false)
  const [status, setStatus]       = useState(task.status)
  const [assignedTo, setAssignedTo] = useState(task.assigned_to ?? '')
  const [saving, setSaving]       = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData()
    fd.set('task_id',     task.id)
    fd.set('vehicle_id',  vehicleId)
    fd.set('status',      status)
    fd.set('assigned_to', assignedTo)
    await updateTask(fd)
    setSaving(false)
    setOpen(false)
  }

  return (
    <div>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div>
          <p className="text-sm font-medium text-slate-900">{task.task_name}</p>
          <p className="text-xs text-slate-400">{task.task_category}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOURS[status] ?? STATUS_COLOURS.pending}`}>
            {status.replace(/_/g, ' ')}
          </span>
          <span className="text-slate-300 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Assigned Fitter</label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {fitters.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  )
}
