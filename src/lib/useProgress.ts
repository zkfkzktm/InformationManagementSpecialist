/** 진도 스토어 구독 훅 */
import { useSyncExternalStore } from 'react'
import { get, getAll, subscribe } from './progress'
import type { TopicProgress } from './types'

export function useTopicProgress(topicId: string): TopicProgress {
  return useSyncExternalStore(subscribe, () => get(topicId))
}

export function useAllProgress() {
  return useSyncExternalStore(subscribe, getAll)
}
