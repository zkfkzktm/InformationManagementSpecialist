import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import TopicDetail from '../components/TopicDetail'
import { getData } from '../lib/data'
import { markSeen } from '../lib/progress'

export default function TopicPage() {
  const { id = '' } = useParams()
  const topic = getData().topicById.get(id)
  useEffect(() => {
    if (topic) markSeen(topic.id)
  }, [topic])
  if (!topic)
    return (
      <div className="py-16 text-center text-ink-2">
        토픽을 찾을 수 없습니다. <Link to="/topics">목록으로</Link>
      </div>
    )
  return <TopicDetail topic={topic} />
}
