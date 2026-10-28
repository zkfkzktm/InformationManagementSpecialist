import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import FilterBar from '../components/FilterBar'
import QuestionCard from '../components/QuestionCard'
import TopicDetail from '../components/TopicDetail'
import { domainName, topicQuestions } from '../lib/data'
import { candidates, pickRandom } from '../lib/pick'
import { loadFilters, markSeen, saveFilters } from '../lib/progress'
import type { Filters, Question, Topic } from '../lib/types'

function pickQuestion(t: Topic, f: Filters): Question {
  let qs = topicQuestions(t)
  if (f.sessions.length === 1) {
    const only = f.sessions[0] === 1 ? qs.filter((q) => q.session === 1) : qs.filter((q) => q.session > 1)
    if (only.length) qs = only
  }
  if (f.round_min) {
    const recent = qs.filter((q) => q.round >= f.round_min)
    if (recent.length) qs = recent
  }
  return qs[Math.floor(Math.random() * qs.length)]
}

export default function Home() {
  const [params, setParams] = useSearchParams()
  const reviewOnly = params.get('review') === '1'
  const [filters, setFilters] = useState<Filters>(loadFilters)
  const [showFilter, setShowFilter] = useState(false)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [revealed, setRevealed] = useState(false)
  const pool = useMemo(() => candidates(filters), [filters])

  const next = (f = filters) => {
    const t = pickRandom(f, topic?.id, reviewOnly)
    setTopic(t)
    setQuestion(t ? pickQuestion(t, f) : null)
    setRevealed(false)
    window.scrollTo({ top: 0 })
  }
  useEffect(() => {
    if (!topic) next()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, reviewOnly])

  const onFilter = (f: Filters) => {
    setFilters(f)
    saveFilters(f)
  }
  const reveal = () => {
    if (topic) markSeen(topic.id)
    setRevealed(true)
  }

  const filterSummary = [
    filters.domains.length ? filters.domains.map(domainName).join('·') : '전체 도메인',
    filters.sessions.length === 1 ? (filters.sessions[0] === 1 ? '1교시' : '2~4교시') : '전 교시',
    filters.round_min ? `${filters.round_min}회 이후` : '전체 회차',
  ].join(' / ')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 text-sm">
        <button type="button" onClick={() => setShowFilter((v) => !v)} className="text-ink-2 underline underline-offset-4 decoration-rule">
          {filterSummary}
        </button>
        {reviewOnly ? (
          <button type="button" onClick={() => { setParams({}); setTopic(null); }} className="px-2 py-0.5 rounded-md bg-pen-soft text-pen">
            복습 큐 출제 중 · 해제
          </button>
        ) : (
          <span className="text-ink-3">{pool.length}개 토픽</span>
        )}
      </div>
      {showFilter && (
        <div className="bg-sheet border border-rule rounded-sm p-3">
          <FilterBar value={filters} onChange={onFilter} />
        </div>
      )}

      {!topic || !question ? (
        <div className="py-16 text-center text-ink-2">
          조건에 맞는 토픽이 없습니다. 필터를 넓혀 보세요.
        </div>
      ) : (
        <>
          <QuestionCard q={question} />

          {!revealed ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={reveal}
                className="flex-1 h-12 rounded-md bg-ink text-paper font-semibold"
              >
                답안 보기
              </button>
              <button type="button" onClick={() => next()} className="h-12 px-5 rounded-md border border-rule bg-sheet text-ink-2">
                건너뛰기
              </button>
            </div>
          ) : (
            <>
              <TopicDetail topic={topic} initialTab={question.session === 1 ? 'short' : 'long'} />
              <div className="flex gap-2 sticky bottom-16 sm:bottom-4">
                <button
                  type="button"
                  onClick={() => next()}
                  className="flex-1 h-12 rounded-md bg-ink text-paper font-semibold shadow-md"
                >
                  다음 문제
                </button>
                <Link
                  to={`/topic/${topic.id}`}
                  className="h-12 px-4 inline-flex items-center rounded-md border border-rule bg-sheet text-ink-2 no-underline"
                >
                  토픽 페이지
                </Link>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
