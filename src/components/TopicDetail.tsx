import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { domainName, getData, topicQuestions, useAnswers } from '../lib/data'
import { TIER_INFO } from '../lib/priority'
import type { Topic } from '../lib/types'
import AnswerView from './AnswerView'
import PdfMenu from './PdfMenu'
import TopicActions from './TopicActions'

type Tab = 'short' | 'long'

/** 토픽 상세: 답안 탭(1교시형/서술형) · 키워드 · 기출 이력 · 학습 상태 */
export default function TopicDetail({ topic, initialTab }: { topic: Topic; initialTab?: Tab }) {
  const qs = topicQuestions(topic)
  const answers = useAnswers(topic)
  const hasShort = !!answers.data?.short
  const hasLong = !!answers.data?.long
  const [tab, setTab] = useState<Tab>(initialTab ?? 'short')
  useEffect(() => {
    if (initialTab) setTab(initialTab)
  }, [initialTab, topic.id])
  const md = tab === 'short' ? answers.data?.short : answers.data?.long
  const { keywordById, tierById, rankById } = getData()
  const tier = tierById.get(topic.id)
  const kws = (topic.keywords ?? []).map((id) => keywordById.get(id)).filter((k) => !!k)

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-ink-3 flex items-center gap-1.5">
            {domainName(topic.domain)}
            {tier && (
              <Link to={`/priority?tier=${tier}`} className={`px-1.5 py-0.5 rounded text-xs no-underline ${TIER_INFO[tier].badge}`}>
                {TIER_INFO[tier].label} {rankById.get(topic.id)}위
              </Link>
            )}
          </div>
          <h1 className="text-xl font-bold m-0 leading-snug">{topic.title}</h1>
          {topic.title_en && topic.title_en !== topic.title && (
            <div className="text-sm text-ink-2">{topic.title_en}</div>
          )}
        </div>
        <PdfMenu topic={topic} answers={answers.data} />
      </header>

      <TopicActions topicId={topic.id} />

      <div className="border border-rule rounded-sm overflow-hidden">
        <div className="flex border-b border-rule bg-paper text-sm">
          <button
            type="button"
            onClick={() => setTab('short')}
            aria-selected={tab === 'short'}
            role="tab"
            className={`px-4 py-2 ${tab === 'short' ? 'bg-sheet font-semibold text-ink' : 'text-ink-2'}`}
          >
            1교시형 · 10점
          </button>
          <button
            type="button"
            onClick={() => setTab('long')}
            aria-selected={tab === 'long'}
            role="tab"
            className={`px-4 py-2 ${tab === 'long' ? 'bg-sheet font-semibold text-ink' : 'text-ink-2'}`}
          >
            서술형 · 25점
          </button>
        </div>
        {md ? (
          <div className="sheet px-4 py-[0.35rem]">
            <AnswerView markdown={md} />
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-ink-3 text-sm bg-sheet">
            {answers.loading
              ? '답안 불러오는 중…'
              : answers.error
                ? '답안을 불러오지 못했습니다. 연결을 확인하고 다시 열어 주세요.'
                : hasShort || hasLong
                  ? '이 양식의 답안은 아직 없습니다.'
                  : '답안 예시 준비 중인 토픽입니다.'}
          </div>
        )}
      </div>

      {kws.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-ink-2 m-0 mb-1.5">키워드</h2>
          <div className="flex flex-wrap gap-1.5">
            {kws.map((k) => (
              <Link
                key={k.id}
                to={`/wiki/${k.id}`}
                className="px-2 py-0.5 rounded-md bg-pen-soft text-pen text-sm no-underline"
              >
                {k.term}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-ink-2 m-0 mb-1.5">기출 이력 · {qs.length}회</h2>
        <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
          {qs.map((q) => (
            <li key={q.id} className="bg-sheet border border-rule rounded-sm px-3 py-2">
              <div className="text-xs text-ink-3">
                제{q.round}회 {q.session}교시 {q.number}번 · {q.session === 1 ? 10 : 25}점
              </div>
              <div className="exam-text text-[0.95rem] leading-7">{q.text}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
