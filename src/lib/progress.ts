/** 학습 진도 저장: localStorage 우선, 로그인 시 Supabase user_progress와 양방향 동기화(updated_at 최신 우선). */
import { supabase } from './supabase'
import type { Confidence, Filters, TopicProgress } from './types'

const KEY = 'gisulsa.progress.v1'
const FILTER_KEY = 'gisulsa.filters.v1'

type Store = Record<string, TopicProgress>
type Listener = () => void

let store: Store = read()
const listeners = new Set<Listener>()
let userId: string | null = null

function read(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    /* 사생활 모드 등 — 메모리만 유지 */
  }
  listeners.forEach((l) => l())
}

export function subscribe(l: Listener) {
  listeners.add(l)
  return () => listeners.delete(l)
}
export function getAll(): Store {
  return store
}
export function get(topicId: string): TopicProgress {
  return (
    store[topicId] ?? {
      topic_id: topicId,
      confidence: 0,
      bookmarked: false,
      last_seen_at: null,
      view_count: 0,
      updated_at: '1970-01-01T00:00:00.000Z',
    }
  )
}

function put(p: TopicProgress) {
  store = { ...store, [p.topic_id]: p }
  persist()
  void pushRemote(p)
}

export function setConfidence(topicId: string, c: Confidence) {
  put({ ...get(topicId), confidence: c, updated_at: new Date().toISOString() })
}
export function toggleBookmark(topicId: string) {
  const cur = get(topicId)
  put({ ...cur, bookmarked: !cur.bookmarked, updated_at: new Date().toISOString() })
}
export function markSeen(topicId: string) {
  const cur = get(topicId)
  const now = new Date().toISOString()
  put({ ...cur, last_seen_at: now, view_count: cur.view_count + 1, updated_at: now })
}
export function clearLocal() {
  store = {}
  persist()
}

/* ---------- 필터 ---------- */
export function loadFilters(): Filters {
  try {
    const f = JSON.parse(localStorage.getItem(FILTER_KEY) ?? 'null')
    if (f) return f
  } catch {
    /* 무시 */
  }
  return { domains: [], sessions: [], round_min: 0 }
}
export function saveFilters(f: Filters) {
  try {
    localStorage.setItem(FILTER_KEY, JSON.stringify(f))
  } catch {
    /* 무시 */
  }
}

/* ---------- 원격 동기화 ---------- */
async function pushRemote(p: TopicProgress) {
  if (!supabase || !userId) return
  await supabase.from('user_progress').upsert({ user_id: userId, ...p }, { onConflict: 'user_id,topic_id' })
}

/** 로그인 직후 호출: 원격 ↔ 로컬 병합 후 양쪽 반영 */
export async function syncWithRemote(uid: string) {
  if (!supabase) return
  userId = uid
  const { data, error } = await supabase.from('user_progress').select('*').eq('user_id', uid)
  if (error) throw error
  const merged: Store = { ...store }
  const toPush: TopicProgress[] = []
  for (const row of data ?? []) {
    const remote: TopicProgress = {
      topic_id: row.topic_id,
      confidence: row.confidence,
      bookmarked: row.bookmarked,
      last_seen_at: row.last_seen_at,
      view_count: row.view_count,
      updated_at: row.updated_at,
    }
    const local = merged[row.topic_id]
    if (!local || local.updated_at < remote.updated_at) merged[row.topic_id] = remote
    else if (local.updated_at > remote.updated_at) toPush.push(local)
  }
  const remoteIds = new Set((data ?? []).map((r) => r.topic_id))
  for (const p of Object.values(merged)) if (!remoteIds.has(p.topic_id)) toPush.push(p)
  store = merged
  persist()
  if (toPush.length)
    await supabase
      .from('user_progress')
      .upsert(toPush.map((p) => ({ user_id: uid, ...p })), { onConflict: 'user_id,topic_id' })
}

export function setUser(uid: string | null) {
  userId = uid
}
