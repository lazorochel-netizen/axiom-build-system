'use client'

export default function PreviewEmailButton({ previewBaseUrl }: { previewBaseUrl: string }) {
  function handleClick() {
    const textarea = document.getElementById('custom-message-input') as HTMLTextAreaElement | null
    const message  = textarea?.value?.trim() ?? ''
    const url      = message
      ? `${previewBaseUrl}?message=${encodeURIComponent(message)}`
      : previewBaseUrl
    window.open(url, '_blank')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
    >
      Preview Email ↗
    </button>
  )
}
