/** 정적 JSON 로딩 + 조회 인덱스. 앱 시작 시 loadAll() 1회, 이후 동기 조회. */
import type { Domain, Keyword, Question, Topic } from './types'

export interface Dataset {
  domains: Domain[]
  questions: Question[]
  topics: Topic[]
  keywords: Keyword[]
  questionById: Map<string, Question>
  topicById: Map<string, Topic>
  keywordById: Map<string, Keyword>
  topicsByQuestion: Map<string, Topic>
}

let cache: Dataset | null = null

async function fetchJson<T>(name: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${name}.json`)
  if (!res.ok) throw new Error(`${name}.json 로딩 실패 (${res.status})`)
  return res.json()
}

export async function loadAll(): Promise<Dataset> {
  if (cache) return cache
  const [domains, questions, topics, keywords] = await Promise.all([
    fetchJson<Domain[]>('domains'),
    fetchJson<Question[]>('questions'),
    fetchJson<Topic[]>('topics'),
    fetchJson<Keyword[]>('keywords').catch(() => [] as Keyword[]),
  ])
  const questionById = new Map(questions.map((q) => [q.id, q]))
  const topicById = new Map(topics.map((t) => [t.id, t]))
  const keywordById = new Map(keywords.map((k) => [k.id, k]))
  const topicsByQuestion = new Map<string, Topic>()
  for (const t of topics) for (const qid of t.question_ids) topicsByQuestion.set(qid, t)
  cache = { domains, questions, topics, keywords, questionById, topicById, keywordById, topicsByQuestion }
  return cache
}

export function getData(): Dataset {
  if (!cache) throw new Error('loadAll() 이전 호출')
  return cache
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
