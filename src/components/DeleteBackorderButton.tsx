'use client'

import { deleteBackorder } from '@/actions/kit-backorders'

export default function DeleteBackorderButton({ id }: { id: string }) {
  async function handleDelete(formData: FormData) {
    const confirmed = window.confirm('Delete this back order request?')
    if (!confirmed) return
    await deleteBackorder(formData)
  }

  return (
    <form action={handleDelete}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs text-slate-400 hover:text-red-500 transition-colors">
        Delete
      </button>
    </form>
  )
}
