'use client'

export default function LangToggle({
  lang,
  baseUrl,
}: {
  lang: string
  baseUrl: string
}) {
  function toggle() {
    const url = new URL(baseUrl, window.location.origin)
    // Preserve existing search params (e.g. sort)
    const current = new URLSearchParams(window.location.search)
    current.forEach((v, k) => url.searchParams.set(k, v))
    if (lang === 'zh') {
      url.searchParams.delete('lang')
    } else {
      url.searchParams.set('lang', 'zh')
    }
    window.location.href = url.toString()
  }

  return (
    <button
      onClick={toggle}
      className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
    >
      {lang === 'zh' ? 'EN' : '中文'}
    </button>
  )
}
