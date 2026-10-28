/** 데이터 타입 정의. 읽는 순서: Question → Topic → Keyword → Progress. data.ts가 로딩, progress.ts가 저장. */

export type DomainCode = 'SE' | 'DB' | 'NW' | 'SEC' | 'CA' | 'MGT' | 'NEW' | 'DS'

export interface Domain {
  code: DomainCode
  name: string
  description: string
}

export interface Question {
  id: string          // r139-s1-q01
  round: number       // 회차
  session: 1 | 2 | 3 | 4
  number: number
  text: string
}

export interface Topic {
  id: string
  title: string
  title_en: string
  domain: DomainCode
  aliases: string[]
  question_ids: string[]
  answers?: { short?: string; long?: string }   // Markdown, [[kw-id|표시]] 링크
  keywords?: string[]
}

export interface Keyword {
  id: string
  term: string
  term_en: string
  definition: string
  features: string[]
  related: string[]     // keyword ids
  topic_ids: string[]
}

/** 0 미학습 · 1 모름 · 2 애매 · 3 안다 */
export type Confidence = 0 | 1 | 2 | 3

export interface TopicProgress {
  topic_id: string
  confidence: Confidence
  bookmarked: boolean
  last_seen_at: string | null
  view_count: number
  updated_at: string
}

export interface Filters {
  domains: DomainCode[]      // 빈 배열 = 전체
  sessions: Array<1 | 2>     // 1 = 1교시형, 2 = 서술형(2~4교시). 빈 배열 = 전체
  round_min: number          // 0 = 전체
}
