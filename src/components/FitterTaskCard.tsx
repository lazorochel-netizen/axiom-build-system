'use client'

import { useState, useRef } from 'react'
import { uploadTaskPhoto } from '@/actions/photos'

type Props = {
  task: {
    id: string
    task_name: string
    task_category: string
    status: string
    photo_required: boolean
    notes: string | null
  }
  vehicleId: string
  token: string
  completeAction: (formData: FormData) => Promise<void>
  uncompleteAction: (formData: FormData) => Promise<void>
}

export default function FitterTaskCard({ task, vehicleId, token, completeAction, uncompleteAction }: Props) {
  const isComplete = task.status === 'completed'
  const [showUpload, setShowUpload] = useState(false)
  const [preview, setPreview]       = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPreview(URL.createObjectURL(file))
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUploading(true)
    const fd = new FormData(e.currentTarget)
    fd.set('task_id', task.id)
    fd.set('vehicle_id', vehicleId)
    fd.set('token', token)
    await uploadTaskPhoto(fd)
    setUploading(false)
    setShowUpload(false)
    setPreview(null)
  }

  return (
    <div className={`bg-white rounded-xl border px-4 py-3.5 transition-opacity ${
      isComplete ? 'border-green-200 opacity-70' : 'border-slate-200'
    }`}>
      <div className="flex items-start gap-3">
        {/* Complete toggle */}
        <form action={isComplete ? uncompleteAction : completeAction}>
          <button
            type="submit"
            className={`mt-0.5 w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
              isComplete
                ? 'border-green-500 bg-green-500'
                : 'border-slate-300 hover:border-blue-400'
            }`}
            aria-label={isComplete ? 'Mark incomplete' : 'Mark complete'}
          >
            {isComplete && (
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </form>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isComplete ? 'line-through text-slate-400' : 'text-slate-900'}`}>
            {task.task_name}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{task.task_category}</p>
          {task.notes && (
            <p className="text-xs text-slate-500 mt-1 italic">{task.notes}</p>
          )}
          {task.photo_required && !isComplete && (
            <button
              type="button"
              onClick={() => setShowUpload(v => !v)}
              className="mt-2 text-xs text-amber-600 underline"
            >
              📷 {showUpload ? 'Hide upload' : 'Upload photo (required)'}
            </button>
          )}
          {task.photo_required && isComplete && (
            <p className="text-xs text-green-600 mt-1">📷 Photo submitted</p>
          )}
        </div>
      </div>

      {showUpload && !isComplete && (
        <form onSubmit={handleUpload} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <input
            ref={fileRef}
            type="file"
            name="photo"
            accept="image/*"
            capture="environment"
            required
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {preview && (
            <img src={preview} alt="Preview" className="rounded-lg max-h-40 object-cover w-full" />
          )}
          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            {uploading ? 'Uploading…' : 'Submit Photo'}
          </button>
        </form>
      )}
    </div>
  )
}
