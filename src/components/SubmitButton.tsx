'use client'

import { useFormStatus } from 'react-dom'

export default function SubmitButton({
  label,
  pendingLabel,
  className,
}: {
  label: string
  pendingLabel?: string
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={className ?? 'bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors'}
    >
      {pending ? (pendingLabel ?? `${label}…`) : label}
    </button>
  )
}
