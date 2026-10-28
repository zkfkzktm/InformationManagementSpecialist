import { useEffect, useId, useRef, useState } from 'react'

let mermaidPromise: Promise<typeof import('mermaid')['default']> | null = null
function loadMermaid() {
  if (!mermaidPromise)
    mermaidPromise = import('mermaid').then((m) => {
      const dark = document.documentElement.dataset.theme === 'dark' ||
        (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
      m.default.initialize({
        startOnLoad: false,
        theme: dark ? 'dark' : 'neutral',
        fontFamily: 'Pretendard Variable, Pretendard, sans-serif',
        flowchart: { htmlLabels: true, curve: 'linear' },
        securityLevel: 'strict',
      })
      return m.default
    })
  return mermaidPromise
}

/** 구성도: mermaid 코드 → SVG. 실패하면 원문 코드를 그대로 보여줌 */
export default function Mermaid({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    loadMermaid()
      .then((m) => m.render(`mm${id}`, code))
      .then(({ svg }) => {
        if (alive && ref.current) ref.current.innerHTML = svg
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [code, id])
  if (failed) return <pre>{code}</pre>
  return <div ref={ref} className="diagram my-3 overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto" />
}
