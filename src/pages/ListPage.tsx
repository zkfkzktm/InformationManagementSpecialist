import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getData } from '../lib/data'
import { TIER_INFO } from '../lib/priority'
import { useAllProgress } from '../lib/useProgress'
import type { DomainCode } from '../lib/types'

const dot: Record<number, string> = { 0: 'bg-rule', 1: 'bg-stamp', 2: 'bg-warn', 3: 'bg-ok' }

export default function ListPage() {
  const { domains, topics, keywords, tierById } = getData()
  const progress = useAllProgress()
  const [domain, setDomain] = useState<DomainCode | ''>('')
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return topics
      .filter((t) => !domain || t.domain === domain)
      .filter(
        (t) =>
          !needle ||
          t.title.toLowerCase().includes(needle) ||
          t.title_en.toLowerCase().includes(needle) ||
          t.aliases.some((a) => a.toLowerCase().includes(needle)),
      )
      .sort((a, b) => b.question_ids.length - a.question_ids.length || a.title.localeCompare(b.title, 'ko'))
  }, [topics, domain, q])

  const kwHits = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    return keywords.filter((k) => k.term.toLowerCase().includes(needle) || k.term_en.toLowerCase().includes(needle)).slice(0, 10)
  }, [keywords, q])

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="토픽·키워드 검색"
        className="w-full h-11 px-3 rounded-md border border-rule bg-sheet"
      />
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setDomain('')}
          className={`px-2.5 py-1 rounded-full text-sm border ${!domain ? 'bg-ink text-paper border-ink' : 'bg-sheet text-ink-2 border-rule'}`}
        >
          전체
        </button>
        {domains.map((d) => (
          <button
            key={d.code}
            type="button"
            onClick={() => setDomain(d.code)}
            className={`px-2.5 py-1 rounded-full text-sm border ${domain === d.code ? 'bg-ink text-paper border-ink' : 'bg-sheet text-ink-2 border-rule'}`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {kwHits.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {kwHits.map((k) => (
            <Link key={k.id} to={`/wiki/${k.id}`} className="px-2 py-0.5 rounded-md bg-pen-soft text-pen text-sm no-underline">
              {k.term}
            </Link>
          ))}
        </div>
      )}

      <div className="text-sm text-ink-3">{list.length}개 토픽</div>
      <ul className="m-0 p-0 list-none flex flex-col gap-1">
        {list.map((t) => {
          const p = progress[t.id]
          return (
            <li key={t.id}>
              <Link to={`/topic/${t.id}`} className="flex items-center gap-3 px-3 py-2.5 bg-sheet border border-rule rounded-sm no-underline text-ink">
                <span className={`w-2 h-2 rounded-full shrink-0 ${dot[p?.confidence ?? 0]}`} aria-hidden />
                <span className="flex-1 min-w-0 truncate">{t.title}</span>
                {p?.bookmarked && <span className="text-xs text-pen">북마크</span>}
                {tierById.has(t.id) && (
                  <span className={`px-1.5 py-0.5 rounded text-xs shrink-0 ${TIER_INFO[tierById.get(t.id)!].badge}`}>
                    {TIER_INFO[tierById.get(t.id)!].label}
                  </span>
                )}
                <span className="text-xs text-ink-3 shrink-0">{t.question_ids.length}회</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
