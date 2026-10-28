import type { Question } from '../lib/types'

/** 시험지 머리말 + 문항. 실제 시험지의 표기("기술사 제139회 제1교시")를 따름 */
export default function QuestionCard({ q }: { q: Question }) {
  const score = q.session === 1 ? 10 : 25
  return (
    <article className="bg-sheet border border-rule rounded-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-rule text-sm text-ink-2">
        <span>
          기술사 제{q.round}회 · 제{q.session}교시
        </span>
        <span>
          {q.number}번 · {score}점
        </span>
      </div>
      <p className="exam-text px-4 py-4 m-0">{q.text}</p>
    </article>
  )
}
