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
  const [open, setOpen] = useState(false)

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
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOURS[task.status] ?? STATUS_COLOURS.pending}`}>
            {task.status.replace(/_/g, ' ')}
          </span>
          <span className="text-slate-300 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <form
          action={updateTask}
          className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100 space-y-3"
        >
          <input type="hidden" name="task_id" value={task.id} />
          <input type="hidden" name="vehicle_id" value={vehicleId} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                name="status"
                defaultValue={task.status}
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
                name="assigned_to"
                defaultValue={task.assigned_to ?? ''}
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
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Save
          </button>
        </form>
      )}
    </div>
  )
}
