'use client'

import { useState } from 'react'
import { addJobNote } from '@/actions/notes'

export default function JobNoteForm({ vehicleId, existingNotes }: {
  vehicleId: string
  existingNotes: { text: string; created_at: string; user_name?: string }[]
}) {
  const [open, setOpen]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [note, setNote]       = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!note.trim()) return
    setSaving(true)
    const fd = new FormData()
    fd.set('vehicle_id', vehicleId)
    fd.set('note', note)
    await addJobNote(fd)
    setSaving(false)
    setSaved(true)
    setNote('')
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="border-t border-slate-100">
      {/* Existing notes */}
      {existingNotes.length > 0 && (
        <div className="px-4 pt-3 space-y-2">
          {existingNotes.map((n, i) => (
            <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-700">{n.text}</p>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(n.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add note toggle */}
      <div className="px-4 py-3">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            + Add note or change
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Customer requested upgraded solar panel — Renogy 200W instead of 175W"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !note.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Note'}
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setNote('') }}
                className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
