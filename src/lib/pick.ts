/** 랜덤 출제: 필터 → 후보 → 자신감 가중치 추첨. 직전 토픽은 제외. */
import { getData, topicQuestions } from './data'
import { get } from './progress'
import type { Confidence, Filters, Topic } from './types'

/** 미학습 3 · 모름 4 · 애매 2 · 안다 1 */
export const WEIGHT: Record<Confidence, number> = { 0: 3, 1: 4, 2: 2, 3: 1 }

export function candidates(f: Filters): Topic[] {
  const { topics } = getData()
  return topics.filter((t) => {
    if (f.domains.length && !f.domains.includes(t.domain)) return false
    const qs = topicQuestions(t)
    if (f.round_min && !qs.some((q) => q.round >= f.round_min)) return false
    if (f.sessions.length) {
      const hasShort = qs.some((q) => q.session === 1)
      const hasLong = qs.some((q) => q.session > 1)
      const ok = (f.sessions.includes(1) && hasShort) || (f.sessions.includes(2) && hasLong)
      if (!ok) return false
    }
    return true
  })
}

export function pickRandom(f: Filters, excludeId?: string, reviewOnly = false): Topic | null {
  let pool = candidates(f)
  if (reviewOnly) pool = pool.filter((t) => {
    const p = get(t.id)
    return p.bookmarked || p.confidence === 1 || p.confidence === 2
  })
  if (pool.length > 1 && excludeId) pool = pool.filter((t) => t.id !== excludeId)
  if (!pool.length) return null
  const weights = pool.map((t) => WEIGHT[get(t.id).confidence])
  let r = Math.random() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}
