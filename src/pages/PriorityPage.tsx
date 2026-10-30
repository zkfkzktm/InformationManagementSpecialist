import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { domainName, getData, topicQuestions } from '../lib/data'
import { TIER_INFO, TIERS, tierTopics } from '../lib/priority'
import { useAllProgress } from '../lib/useProgress'
import type { DomainCode, Tier } from '../lib/types'

const dot: Record<number, string> = { 0: 'bg-rule', 1: 'bg-stamp', 2: 'bg-warn', 3: 'bg-ok' }

/** 우선 학습: 기출 빈도·최근성으로 고른 대표 토픽을 등급(필수→중요→최신) 순서로 학습 */
export default function PriorityPage() {
  const { priority, domains } = getData()
  const progress = useAllProgress()
  const [params, setParams] = useSearchParams()
  const tier = (TIERS.includes(params.get('tier') as Tier) ? params.get('tier') : 'S') as Tier
  const [domain, setDomain] = useState<DomainCode | ''>('')
  const [showRule, setShowRule] = useState(false)

  const stats = useMemo(
    () =>
      Object.fromEntries(
        TIERS.map((t) => {
          const list = tierTopics(t)
          const seen = list.filter((x) => (progress[x.id]?.view_count ?? 0) > 0).length
          const know = list.filter((x) => progress[x.id]?.confidence === 3).length
          // 이어서 학습: 안 본 것 → 모름·애매 순
          const next =
            list.find((x) => (progress[x.id]?.view_count ?? 0) === 0) ??
            list.find((x) => progress[x.id]?.confidence === 1 || progress[x.id]?.confidence === 2)
          return [t, { total: list.length, seen, know, next }]
        }),
      ) as Record<Tier, { total: number; seen: number; know: number; next?: { id: string; title: string } }>,
    [progress],
  )

  const rows = useMemo(
    () =>
      tierTopics(tier)
        .map((t, i) => {
          const qs = topicQuestions(t)
          return { t, rank: i + 1, n: new Set(qs.map((q) => q.round)).size, last: Math.max(...qs.map((q) => q.round)) }
        })
        .filter((r) => !domain || r.t.domain === domain),
    [tier, domain],
  )

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold m-0">우선 학습</h1>
        <p className="m-0 mt-1 text-sm text-ink-2 [word-break:keep-all]">
          기출 {priority.rounds}개 회차 {priority.questions.toLocaleString()}문항(~{priority.last_round}회)에서 자주·최근에 나온 토픽을
          골라 순서대로 정리했습니다. 필수 → 중요 → 최신 순으로 학습하세요.{' '}
          <button type="button" onClick={() => setShowRule((v) => !v)} className="text-pen underline underline-offset-2">
            {showRule ? '기준 닫기' : '선정 기준'}
          </button>
        </p>
        {showRule && (
          <table className="mt-2 w-full text-sm border-collapse bg-sheet">
            <tbody>
              {TIERS.map((t) => (
                <tr key={t} className="border border-rule">
                  <td className="px-2 py-1.5 w-12 font-semibold">{TIER_INFO[t].label}</td>
                  <td className="px-2 py-1.5 text-ink-2">{TIER_INFO[t].rule}</td>
                </tr>
              ))}
              <tr className="border border-rule">
                <td className="px-2 py-1.5 font-semibold">순서</td>
                <td className="px-2 py-1.5 text-ink-2">
                  등급 안에서는 최근에 자주 나올수록 위 (20회차 전 출제는 절반 가중, 서술형 1.3배)
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </header>

      <div className="grid gap-2 sm:grid-cols-3">
        {TIERS.map((t) => {
          const s = stats[t]
          const pct = s.total ? Math.round((s.seen / s.total) * 100) : 0
          return (
            <section
              key={t}
              className={`bg-sheet border rounded-sm p-3 flex flex-col gap-2 ${tier === t ? 'border-ink' : 'border-rule'}`}
            >
              <button type="button" onClick={() => setParams({ tier: t })} className="text-left flex flex-col gap-1">
                <span className="flex items-baseline gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${TIER_INFO[t].badge}`}>{TIER_INFO[t].label}</span>
                  <span className="text-lg font-bold">{s.total}</span>
                  <span className="text-xs text-ink-3">토픽</span>
                </span>
                <span className="text-xs text-ink-3 [word-break:keep-all]">{TIER_INFO[t].rule}</span>
              </button>
              <div className="h-1.5 rounded-full bg-rule overflow-hidden" aria-label={`학습 ${pct}%`}>
                <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs text-ink-2">
                학습 {s.seen}/{s.total} · 안다 {s.know}
              </div>
              <div className="flex gap-1.5">
                {s.next ? (
                  <Link
                    to={`/topic/${s.next.id}`}
                    className="flex-1 h-9 inline-flex items-center justify-center rounded-md bg-ink text-paper text-sm font-semibold no-underline"
                  >
                    {s.seen ? '이어서 학습' : '1번부터 학습'}
                  </Link>
                ) : (
                  <span className="flex-1 h-9 inline-flex items-center justify-center rounded-md bg-ok/10 text-ok text-sm">완료</span>
                )}
                <Link
                  to={`/?tier=${t}`}
                  className="h-9 px-3 inline-flex items-center rounded-md border border-rule text-sm text-ink-2 no-underline"
                >
                  랜덤 출제
                </Link>
              </div>
            </section>
          )
        })}
      </div>

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

      <div className="text-sm text-ink-3">
        {TIER_INFO[tier].label} {rows.length}개 토픽 · 우선순위 순
      </div>
      <ol className="m-0 p-0 list-none flex flex-col gap-1">
        {rows.map(({ t, rank, n, last }) => {
          const p = progress[t.id]
          return (
            <li key={t.id}>
              <Link to={`/topic/${t.id}`} className="flex items-center gap-3 px-3 py-2.5 bg-sheet border border-rule rounded-sm no-underline text-ink">
                <span className="w-7 shrink-0 text-right text-xs text-ink-3 tabular-nums">{rank}</span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${dot[p?.confidence ?? 0]}`} aria-hidden />
                <span className="flex-1 min-w-0">
                  <span className={`block truncate ${(p?.view_count ?? 0) > 0 ? 'text-ink-2' : ''}`}>{t.title}</span>
                  <span className="block text-xs text-ink-3">
                    {domainName(t.domain)} · 기출 {n}회 · 최근 {last}회
                  </span>
                </span>
                {p?.bookmarked && <span className="text-xs text-pen shrink-0">북마크</span>}
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
