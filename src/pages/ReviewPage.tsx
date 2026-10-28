import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getData } from '../lib/data'
import { useAllProgress } from '../lib/useProgress'

const label: Record<number, string> = { 0: '미학습', 1: '모름', 2: '애매', 3: '안다' }
const tone: Record<number, string> = { 0: 'text-ink-3', 1: 'text-stamp', 2: 'text-warn', 3: 'text-ok' }

/** 복습 큐: 북마크 또는 모름·애매 토픽. 모름 → 애매 → 북마크 순, 오래 안 본 것 우선 */
export default function ReviewPage() {
  const { topicById } = getData()
  const progress = useAllProgress()
  const items = useMemo(
    () =>
      Object.values(progress)
        .filter((p) => p.bookmarked || p.confidence === 1 || p.confidence === 2)
        .map((p) => ({ p, t: topicById.get(p.topic_id) }))
        .filter((x) => !!x.t)
        .sort((a, b) => {
          const rank = (c: number) => (c === 1 ? 0 : c === 2 ? 1 : 2)
          return rank(a.p.confidence) - rank(b.p.confidence) || (a.p.last_seen_at ?? '').localeCompare(b.p.last_seen_at ?? '')
        }),
    [progress, topicById],
  )
  const stats = useMemo(() => {
    const all = Object.values(progress)
    return {
      seen: all.filter((p) => p.view_count > 0).length,
      know: all.filter((p) => p.confidence === 3).length,
      unsure: all.filter((p) => p.confidence === 2).length,
      dont: all.filter((p) => p.confidence === 1).length,
    }
  }, [progress])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          ['본 토픽', stats.seen, 'text-ink'],
          ['안다', stats.know, 'text-ok'],
          ['애매', stats.unsure, 'text-warn'],
          ['모름', stats.dont, 'text-stamp'],
        ].map(([l, v, c]) => (
          <div key={l as string} className="bg-sheet border border-rule rounded-sm py-2">
            <div className={`text-xl font-bold ${c}`}>{v}</div>
            <div className="text-xs text-ink-3">{l}</div>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center text-ink-2">
          복습할 토픽이 없습니다. 출제 화면에서 모름·애매를 표시하거나 북마크하면 여기에 쌓입니다.
        </div>
      ) : (
        <>
          <Link to="/?review=1" className="h-12 inline-flex items-center justify-center rounded-md bg-ink text-paper font-semibold no-underline">
            복습 큐에서 랜덤 출제
          </Link>
          <ul className="m-0 p-0 list-none flex flex-col gap-1">
            {items.map(({ p, t }) => (
              <li key={p.topic_id}>
                <Link to={`/topic/${t!.id}`} className="flex items-center gap-3 px-3 py-2.5 bg-sheet border border-rule rounded-sm no-underline text-ink">
                  <span className={`text-xs w-10 shrink-0 ${tone[p.confidence]}`}>{label[p.confidence]}</span>
                  <span className="flex-1 min-w-0 truncate">{t!.title}</span>
                  {p.bookmarked && <span className="text-xs text-pen">북마크</span>}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
