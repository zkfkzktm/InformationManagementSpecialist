import { useEffect, useRef, useState } from 'react'
import type { Answers, Topic } from '../lib/types'
import PrintSheet, { type PrintForm } from './PrintSheet'

/** "PDF 저장" 버튼 + 양식 선택. 고르면 인쇄 답안지를 만들고 인쇄 대화상자(→ PDF로 저장)를 연다 */
export default function PdfMenu({ topic, answers }: { topic: Topic; answers: Answers | undefined }) {
  const [open, setOpen] = useState(false)
  // n: 같은 양식을 다시 골라도 새로 인쇄하도록 매번 새 key
  const [job, setJob] = useState<{ topicId: string; forms: PrintForm[]; n: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const options: Array<{ label: string; forms: PrintForm[] }> = []
  if (answers?.short) options.push({ label: '1교시형 (10점)', forms: ['short'] })
  if (answers?.long) options.push({ label: '서술형 (25점)', forms: ['long'] })
  if (answers?.short && answers?.long) options.push({ label: '두 양식 모두', forms: ['short', 'long'] })

  const active = job && job.topicId === topic.id ? job : null

  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        disabled={options.length === 0}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="px-3 py-1.5 rounded-md border border-rule text-sm text-ink-2 hover:text-ink disabled:opacity-40"
      >
        PDF 저장
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 z-30 w-40 bg-sheet border border-rule rounded-md shadow-lg py-1">
          {options.map((o) => (
            <button
              key={o.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                setJob((j) => ({ topicId: topic.id, forms: o.forms, n: (j?.n ?? 0) + 1 }))
              }}
              className="block w-full text-left px-3 py-2 text-sm text-ink hover:bg-pen-soft"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {active && answers && <PrintSheet key={active.n} topic={topic} answers={answers} forms={active.forms} />}
    </div>
  )
}
