'use client'

import { useState } from 'react'
import { updateTask, deleteTask, editTaskName } from '@/actions/tasks'
import { assignFitterToTask, removeFitterFromTask } from '@/actions/task-fitters'

type Task = {
  id: string
  task_name: string
  task_category: string
  status: string
  assigned_to: string | null
  due_date: string | null
}

type Fitter = {
  id: string
  name: string
}

const STATUS_COLOURS: Record<string, string> = {
  pending:               'bg-slate-100 text-slate-600',
  in_progress:           'bg-blue-100 text-blue-700',
  waiting_on_parts:      'bg-amber-100 text-amber-700',
  waiting_on_compliance: 'bg-purple-100 text-purple-700',
  completed:             'bg-green-100 text-green-700',
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
  assignedFitters = [],
}: {
  task: Task
  vehicleId: string
  fitters: Fitter[]
  assignedFitters?: Fitter[]
}) {
  const [open, setOpen]             = useState(false)
  const [status, setStatus]         = useState(task.status)
  const [taskName, setTaskName]     = useState(task.task_name)
  const [category, setCategory]     = useState(task.task_category)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [localAssigned, setLocalAssigned] = useState<Fitter[]>(assignedFitters)

  const unassignedFitters = fitters.filter(f => !localAssigned.find(a => a.id === f.id))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fdName = new FormData()
    fdName.set('task_id', task.id)
    fdName.set('vehicle_id', vehicleId)
    fdName.set('task_name', taskName)
    fdName.set('task_category', category)
    await editTaskName(fdName)

    const fd = new FormData()
    fd.set('task_id', task.id)
    fd.set('vehicle_id', vehicleId)
    fd.set('status', status)
    fd.set('assigned_to', localAssigned[0]?.id ?? '')
    await updateTask(fd)

    setSaving(false)
    setOpen(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${taskName}"? This cannot be undone.`)) return
    setDeleting(true)
    const fd = new FormData()
    fd.set('task_id', task.id)
    fd.set('vehicle_id', vehicleId)
    await deleteTask(fd)
  }

  async function handleAssignFitter(e: React.ChangeEvent<HTMLSelectElement>) {
    const fitterId = e.target.value
    if (!fitterId) return
    const fitter = fitters.find(f => f.id === fitterId)
    if (!fitter) return
    setLocalAssigned(prev => [...prev, fitter])
    e.target.value = ''
    const fd = new FormData()
    fd.set('task_id', task.id)
    fd.set('user_id', fitterId)
    fd.set('vehicle_id', vehicleId)
    await assignFitterToTask(fd)
  }

  async function handleRemoveFitter(fitterId: string) {
    setLocalAssigned(prev => prev.filter(f => f.id !== fitterId))
    const fd = new FormData()
    fd.set('task_id', task.id)
    fd.set('user_id', fitterId)
    fd.set('vehicle_id', vehicleId)
    await removeFitterFromTask(fd)
  }

  return (
    <div>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900">{taskName}</p>
          <div className="flex items-center gap-1 flex-wrap mt-0.5">
            <p className="text-xs text-slate-400">{category}</p>
            {task.due_date && status !== 'completed' && (
              <>
                <span className="text-slate-300 text-xs">·</span>
                <span className={`text-xs ${new Date(task.due_date) < new Date() ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                  {new Date(task.due_date) < new Date() ? '⚠ Overdue · ' : 'Due '}
                  {new Date(task.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </span>
              </>
            )}
            {localAssigned.length > 0 && (
              <>
                <span className="text-slate-300 text-xs">·</span>
                {localAssigned.map(f => (
                  <span key={f.id} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{f.name}</span>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2">
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

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_on_parts">Waiting for the Kit</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Multi-fitter assignment */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Assigned Fitters</label>
            {localAssigned.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {localAssigned.map(f => (
                  <span key={f.id} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {f.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveFitter(f.id)}
                      className="text-blue-400 hover:text-red-500 font-bold"
                    >✕</button>
                  </span>
                ))}
              </div>
            )}
            {unassignedFitters.length > 0 && (
              <select
                onChange={handleAssignFitter}
                defaultValue=""
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">+ Add fitter…</option>
                {unassignedFitters.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )}
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
