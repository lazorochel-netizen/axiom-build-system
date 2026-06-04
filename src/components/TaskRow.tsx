'use client'

import { useState } from 'react'
import { updateTask, deleteTask, editTaskName } from '@/actions/tasks'

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
  pending:          'bg-slate-100 text-slate-600',
  in_progress:      'bg-blue-100 text-blue-700',
  waiting_for_kit:  'bg-amber-100 text-amber-700',
  completed:        'bg-green-100 text-green-700',
}

const TASK_CATEGORIES = [
  'Structure & Materials',
  'Electrical & Plumbing',
  'Upgrades',
  'Compliance',
  'Quality Check',
  'Other',
]

export default function TaskRow({
  task,
  vehicleId,
  fitters,
}: {
  task: Task
  vehicleId: string
  fitters: Fitter[]
}) {
  const [open, setOpen]             = useState(false)
  const [status, setStatus]         = useState(task.status)
  const [assignedTo, setAssignedTo] = useState(task.assigned_to ?? '')
  const [taskName, setTaskName]     = useState(task.task_name)
  const [category, setCategory]     = useState(task.task_category)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    // Save name/category
    const fdName = new FormData()
    fdName.set('task_id',       task.id)
    fdName.set('vehicle_id',    vehicleId)
    fdName.set('task_name',     taskName)
    fdName.set('task_category', category)
    await editTaskName(fdName)

    // Save status/fitter
    const fd = new FormData()
    fd.set('task_id',     task.id)
    fd.set('vehicle_id',  vehicleId)
    fd.set('status',      status)
    fd.set('assigned_to', assignedTo)
    await updateTask(fd)

    setSaving(false)
    setOpen(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${taskName}"? This cannot be undone.`)) return
    setDeleting(true)
    const fd = new FormData()
    fd.set('task_id',    task.id)
    fd.set('vehicle_id', vehicleId)
    await deleteTask(fd)
  }

  return (
    <div>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div>
          <p className="text-sm font-medium text-slate-900">{taskName}</p>
          <p className="text-xs text-slate-400">{category}</p>
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
          {/* Edit task name & category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Task Name</label>
              <input
                value={taskName}
                onChange={e => setTaskName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TASK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Status & fitter */}
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
                <option value="waiting_for_kit">Waiting for the Kit</option>
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

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm font-medium px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete Task'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
