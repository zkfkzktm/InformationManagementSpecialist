/** 정적 JSON 로딩 + 조회 인덱스. 시작 시 loadAll() 1회(목록·인덱스), 답안·위키 본문은 loadAnswers/loadKeywordDetail로 지연 로딩. */
import { useEffect, useState } from 'react'
import type { Answers, Domain, Keyword, KeywordDetail, KeywordViz, Priority, Question, Tier, Topic } from './types'

export interface Dataset {
  domains: Domain[]
  questions: Question[]
  topics: Topic[]
  keywords: Keyword[]
  questionById: Map<string, Question>
  topicById: Map<string, Topic>
  keywordById: Map<string, Keyword>
  topicsByQuestion: Map<string, Topic>
  topicsByKeyword: Map<string, string[]>
  priority: Priority
  tierById: Map<string, Tier>
  rankById: Map<string, number>   // 등급 안 순위 (1부터)
}

let cache: Dataset | null = null

async function fetchJson<T>(name: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${name}.json`)
  if (!res.ok) throw new Error(`${name}.json 로딩 실패 (${res.status})`)
  return res.json()
}

export async function loadAll(): Promise<Dataset> {
  if (cache) return cache
  const emptyPriority: Priority = { last_round: 0, rounds: 0, questions: 0, tiers: { S: [], A: [], T: [] } }
  const [domains, questions, topics, keywords, priority] = await Promise.all([
    fetchJson<Domain[]>('domains'),
    fetchJson<Question[]>('questions'),
    fetchJson<Topic[]>('topics'),
    fetchJson<Keyword[]>('keywords').catch(() => [] as Keyword[]),
    fetchJson<Priority>('priority').catch(() => emptyPriority),
  ])
  const questionById = new Map(questions.map((q) => [q.id, q]))
  const topicById = new Map(topics.map((t) => [t.id, t]))
  const keywordById = new Map(keywords.map((k) => [k.id, k]))
  const topicsByQuestion = new Map<string, Topic>()
  const topicsByKeyword = new Map<string, string[]>()
  for (const t of topics) {
    for (const qid of t.question_ids) topicsByQuestion.set(qid, t)
    for (const kid of t.keywords ?? []) {
      const arr = topicsByKeyword.get(kid)
      if (arr) arr.push(t.id)
      else topicsByKeyword.set(kid, [t.id])
    }
  }
  const tierById = new Map<string, Tier>()
  const rankById = new Map<string, number>()
  for (const tier of ['S', 'A', 'T'] as Tier[])
    priority.tiers[tier].forEach((id, i) => {
      tierById.set(id, tier)
      rankById.set(id, i + 1)
    })
  cache = {
    domains, questions, topics, keywords, questionById, topicById, keywordById, topicsByQuestion, topicsByKeyword,
    priority, tierById, rankById,
  }
  return cache
}

export function getData(): Dataset {
  if (!cache) throw new Error('loadAll() 이전 호출')
  return cache
}

/* ---------- 지연 로딩 ---------- */
const answerCache = new Map<string, Promise<Record<string, Answers>>>()
const kwCache = new Map<string, Promise<Record<string, KeywordDetail>>>()
const vizCache = new Map<string, Promise<Record<string, KeywordViz>>>()

/** 도메인 답안 묶음. 같은 도메인은 1회만 요청 */
export function loadAnswers(domain: string) {
  let p = answerCache.get(domain)
  if (!p) {
    p = fetchJson<Record<string, Answers>>(`answers/${domain}`)
    p.catch(() => answerCache.delete(domain))
    answerCache.set(domain, p)
  }
  return p
}

function kwShard(id: string) {
  const c = id.charAt(0)
  return /[a-z]/i.test(c) ? c.toLowerCase() : '0'
}

export function loadKeywordDetail(id: string) {
  const s = kwShard(id)
  let p = kwCache.get(s)
  if (!p) {
    p = fetchJson<Record<string, KeywordDetail>>(`kw/${s}`)
    p.catch(() => kwCache.delete(s))
    kwCache.set(s, p)
  }
  return p.then((m) => m[id])
}

/** 도식 파일은 앞 2글자로 잘게 나눔 (파일당 수 KB) — 위키 본문과 따로 받아 본문이 먼저 뜸 */
function vizShard(id: string) {
  return id.slice(0, 2).toLowerCase().replace(/[^a-z0-9]/g, '_').padEnd(2, '_')
}

export function loadKeywordViz(id: string) {
  const s = vizShard(id)
  let p = vizCache.get(s)
  if (!p) {
    p = fetchJson<Record<string, KeywordViz>>(`kwviz/${s}`)
    p.catch(() => vizCache.delete(s)) // 실패하면 다음에 다시 시도
    vizCache.set(s, p)
  }
  // 도식은 부가 정보: 못 받아도 위키 본문은 그대로 보이게 undefined로 끝냄
  return p.then((m) => m[id]).catch(() => undefined)
}

type Async<T> = { data: T | undefined; loading: boolean; error: string | null }

/** 토픽 답안 훅. 반환 : {data: {short,long}|undefined, loading, error} */
export function useAnswers(topic: Topic | undefined): Async<Answers> {
  const [state, setState] = useState<Async<Answers>>({ data: undefined, loading: !!topic?.has_answer, error: null })
  useEffect(() => {
    if (!topic?.has_answer) {
      setState({ data: undefined, loading: false, error: null })
      return
    }
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    loadAnswers(topic.domain)
      .then((m) => alive && setState({ data: m[topic.id], loading: false, error: null }))
      .catch((e) => alive && setState({ data: undefined, loading: false, error: String(e.message ?? e) }))
    return () => {
      alive = false
    }
  }, [topic?.id, topic?.domain, topic?.has_answer])
  return state
}

export function useKeywordDetail(id: string): Async<KeywordDetail> {
  const [state, setState] = useState<Async<KeywordDetail>>({ data: undefined, loading: true, error: null })
  useEffect(() => {
    let alive = true
    setState({ data: undefined, loading: true, error: null })
    loadKeywordDetail(id)
      .then((d) => alive && setState({ data: d, loading: false, error: null }))
      .catch((e) => alive && setState({ data: undefined, loading: false, error: String(e.message ?? e) }))
    return () => {
      alive = false
    }
  }, [id])
  return state
}

export function useKeywordViz(id: string): Async<KeywordViz> {
  const [state, setState] = useState<Async<KeywordViz>>({ data: undefined, loading: true, error: null })
  useEffect(() => {
    let alive = true
    setState({ data: undefined, loading: true, error: null })
    loadKeywordViz(id).then((d) => alive && setState({ data: d, loading: false, error: null }))
    return () => {
      alive = false
    }
  }, [id])
  return state
}

/** 다음 문제 대비 미리 받기 */
export function prefetchAnswers(domain: string) {
  void loadAnswers(domain).catch(() => {})
}

/** 토픽의 기출 문항 (최신 회차 우선) */
export function topicQuestions(t: Topic): Question[] {
  const d = getData()
  return t.question_ids
    .map((id) => d.questionById.get(id))
    .filter((q): q is Question => !!q)
    .sort((a, b) => b.round - a.round || a.session - b.session)
}

/** 1교시형 출제 여부 / 서술형 출제 여부 */
export function topicSessions(t: Topic): { short: boolean; long: boolean } {
  const qs = topicQuestions(t)
  return { short: qs.some((q) => q.session === 1), long: qs.some((q) => q.session > 1) }
}

export function domainName(code: string): string {
  return getData().domains.find((d) => d.code === code)?.name ?? code
}
