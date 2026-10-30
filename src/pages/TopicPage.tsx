import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import TopicDetail from '../components/TopicDetail'
import { getData } from '../lib/data'
import { nextInTier, TIER_INFO } from '../lib/priority'
import { markSeen } from '../lib/progress'
import { useAllProgress } from '../lib/useProgress'

export default function TopicPage() {
  const { id = '' } = useParams()
  const { topicById, tierById } = getData()
  const topic = topicById.get(id)
  useAllProgress() // 학습 기록이 바뀌면 '다음 토픽' 다시 계산
  useEffect(() => {
    if (topic) markSeen(topic.id)
    window.scrollTo({ top: 0 })
  }, [topic])
  if (!topic)
    return (
      <div className="py-16 text-center text-ink-2">
        토픽을 찾을 수 없습니다. <Link to="/topics">목록으로</Link>
      </div>
    )
  // 대표 토픽이면 같은 등급의 다음 우선 토픽으로 이어서 학습
  const tier = tierById.get(topic.id)
  const next = tier ? nextInTier(tier, topic.id) : null
  return (
    <div className="flex flex-col gap-4">
      <TopicDetail topic={topic} />
      {tier && (
        <div className="flex gap-2 sticky bottom-16 sm:bottom-4">
          {next ? (
            <Link
              to={`/topic/${next.id}`}
              className="flex-1 h-12 inline-flex items-center justify-center gap-1 rounded-md bg-ink text-paper font-semibold shadow-md no-underline min-w-0"
            >
              <span className="shrink-0">다음 {TIER_INFO[tier].label}:</span>
              <span className="truncate font-normal">{next.title}</span>
            </Link>
          ) : (
            <span className="flex-1 h-12 inline-flex items-center justify-center rounded-md bg-ok/10 text-ok">
              {TIER_INFO[tier].label} 토픽을 모두 학습했습니다
            </span>
          )}
          <Link
            to={`/priority?tier=${tier}`}
            className="h-12 px-4 inline-flex items-center rounded-md border border-rule bg-sheet text-ink-2 no-underline shrink-0"
          >
            목록
          </Link>
        </div>
      )}
    </div>
  )
}
