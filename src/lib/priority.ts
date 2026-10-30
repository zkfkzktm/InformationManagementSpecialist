/** 대표 토픽(우선 학습) 등급 정보와 도우미. 데이터: data/priority.json */
import { getData } from './data'
import { get } from './progress'
import type { Tier, TierFilter, Topic } from './types'

export const TIERS: Tier[] = ['S', 'A', 'T']

export const TIER_INFO: Record<Tier, { label: string; rule: string; badge: string }> = {
  S: { label: '필수', rule: '3회 이상 출제 · 최근 30회차 안에 출제', badge: 'bg-stamp/10 text-stamp' },
  A: { label: '중요', rule: '2회 출제(최근 20회차 안) 또는 3회 이상 고전 토픽', badge: 'bg-pen-soft text-pen' },
  T: { label: '최신', rule: '최근 6회차(약 2년) 안에 처음 출제', badge: 'bg-warn/10 text-warn' },
}

export const TIER_FILTER_LABEL: Record<Exclude<TierFilter, ''>, string> = {
  core: '대표(필수+중요)',
  S: '필수',
  A: '중요',
  T: '최신',
}

export function tierTopics(tier: Tier): Topic[] {
  const { priority, topicById } = getData()
  return priority.tiers[tier].map((id) => topicById.get(id)).filter((t): t is Topic => !!t)
}

/** 우선순위 순으로 다음에 볼 토픽: 안 본 것 → 모름·애매 → 없으면 null. exceptId는 건너뜀 */
export function nextInTier(tier: Tier, exceptId?: string): Topic | null {
  const list = tierTopics(tier).filter((t) => t.id !== exceptId)
  return (
    list.find((t) => get(t.id).view_count === 0) ??
    list.find((t) => get(t.id).confidence === 1 || get(t.id).confidence === 2) ??
    null
  )
}
