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
  const { error } = await supabase.from('user_progress').upsert({ user_id: userId, ...p }, { onConflict: 'user_id,topic_id' })
  setPushError(error ? error.message : null)
}

/* ---------- 동기화 오류 표시 ---------- */
let pushError: string | null = null
function setPushError(e: string | null) {
  if (e === pushError) return
  pushError = e
  listeners.forEach((l) => l())
}
export function getPushError() {
  return pushError
}

const ts = (s: string | null | undefined) => (s ? Date.parse(s) || 0 : 0)
const maxIso = (a: string | null, b: string | null) => (ts(a) >= ts(b) ? a : b)

/** 행 병합: 본 횟수·최근 열람은 큰 값, 자신감·북마크는 나중에 바꾼 쪽 */
function mergeRow(local: TopicProgress, remote: TopicProgress): TopicProgress {
  const newer = ts(local.updated_at) >= ts(remote.updated_at) ? local : remote
  return {
    ...newer,
    view_count: Math.max(local.view_count, remote.view_count),
    last_seen_at: maxIso(local.last_seen_at, remote.last_seen_at),
    updated_at: maxIso(local.updated_at, remote.updated_at) ?? newer.updated_at,
  }
}
const same = (a: TopicProgress, b: TopicProgress) =>
  a.confidence === b.confidence &&
  a.bookmarked === b.bookmarked &&
  a.view_count === b.view_count &&
  ts(a.last_seen_at) === ts(b.last_seen_at) &&
  ts(a.updated_at) === ts(b.updated_at)

/** 로그인 직후 호출: 원격 ↔ 로컬 병합 후 달라진 쪽만 반영 */
export async function syncWithRemote(uid: string) {
  if (!supabase) return
  userId = uid
  const { data, error } = await supabase.from('user_progress').select('*').eq('user_id', uid)
  if (error) throw error
  const merged: Store = { ...store }
  const toPush: TopicProgress[] = []
  const remoteIds = new Set<string>()
  for (const row of data ?? []) {
    remoteIds.add(row.topic_id)
    const remote: TopicProgress = {
      topic_id: row.topic_id,
      confidence: row.confidence,
      bookmarked: row.bookmarked,
      last_seen_at: row.last_seen_at,
      view_count: row.view_count ?? 0,
      updated_at: row.updated_at,
    }
    const local = merged[row.topic_id]
    const m = local ? mergeRow(local, remote) : remote
    merged[row.topic_id] = m
    if (!same(m, remote)) toPush.push(m)
  }
  for (const p of Object.values(merged)) if (!remoteIds.has(p.topic_id)) toPush.push(p)
  store = merged
  persist()
  if (toPush.length) {
    const { error: e } = await supabase
      .from('user_progress')
      .upsert(toPush.map((p) => ({ user_id: uid, ...p })), { onConflict: 'user_id,topic_id' })
    setPushError(e ? e.message : null)
  }
}

export function setUser(uid: string | null) {
  userId = uid
}
