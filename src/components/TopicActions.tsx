import { setConfidence, toggleBookmark } from '../lib/progress'
import { useTopicProgress } from '../lib/useProgress'
import type { Confidence } from '../lib/types'

const levels: Array<{ c: Confidence; label: string; cls: string }> = [
  { c: 1, label: '모름', cls: 'bg-stamp text-white border-stamp' },
  { c: 2, label: '애매', cls: 'bg-warn text-white border-warn' },
  { c: 3, label: '안다', cls: 'bg-ok text-white border-ok' },
]

/** 북마크 토글 + 자신감 3단계. 같은 단계를 다시 누르면 해제(미학습). */
export default function TopicActions({ topicId }: { topicId: string }) {
  const p = useTopicProgress(topicId)
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => toggleBookmark(topicId)}
        aria-pressed={p.bookmarked}
        className={`px-3 py-1.5 rounded-md border text-sm ${
          p.bookmarked ? 'bg-pen text-white border-pen' : 'border-rule text-ink-2 bg-sheet'
        }`}
      >
        {p.bookmarked ? '북마크됨' : '북마크'}
      </button>
      <span className="w-px h-5 bg-rule mx-1" aria-hidden />
      {levels.map((l) => (
        <button
          key={l.c}
          type="button"
          aria-pressed={p.confidence === l.c}
          onClick={() => setConfidence(topicId, p.confidence === l.c ? 0 : l.c)}
          className={`px-3 py-1.5 rounded-md border text-sm ${
            p.confidence === l.c ? l.cls : 'border-rule text-ink-2 bg-sheet'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
