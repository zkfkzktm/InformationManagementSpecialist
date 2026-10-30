import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { domainName, topicQuestions } from '../lib/data'
import type { Answers, Question, Topic } from '../lib/types'
import AnswerView from './AnswerView'

export type PrintForm = 'short' | 'long'
const FORM_LABEL: Record<PrintForm, string> = { short: '1교시형 · 10점', long: '서술형 · 25점' }
const FORM_FILE: Record<PrintForm, string> = { short: '1교시형', long: '서술형' }

/** 양식에 맞는 가장 최근 기출 문항 (1교시형 = 1교시, 서술형 = 2~4교시) */
function latestQuestion(qs: Question[], form: PrintForm) {
  return qs
    .filter((q) => (form === 'short' ? q.session === 1 : q.session > 1))
    .sort((a, b) => b.round - a.round)[0]
}

/**
 * PDF 저장용 인쇄 답안지.
 * 화면 밖(보이지 않는 곳)에 그려 두고, 구성도·글꼴이 준비되면 인쇄 대화상자를 연다.
 * 인쇄 뒤에도 남겨 둠: 모바일 브라우저는 인쇄 창이 닫힌 뒤에 PDF를 만드는 경우가 있음.
 */
export default function PrintSheet({ topic, answers, forms }: { topic: Topic; answers: Answers; forms: PrintForm[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const qs = topicQuestions(topic)

  useEffect(() => {
    const html = document.documentElement
    const prevTitle = document.title
    // 저장 대화상자의 기본 파일 이름 = 문서 제목
    const fileTitle = `${topic.title.replace(/[\\/:*?"<>|]/g, ' ')}_${forms.map((f) => FORM_FILE[f]).join('·')}`
    let cancelled = false
    const restoreTitle = () => {
      document.title = prevTitle
    }
    window.addEventListener('afterprint', restoreTitle)
    ;(async () => {
      const start = Date.now()
      while (!cancelled && Date.now() - start < 10000) {
        if (ref.current && !ref.current.querySelector('.diagram:empty')) break
        await new Promise((r) => setTimeout(r, 100))
      }
      await document.fonts?.ready
      if (cancelled) return
      html.classList.add('print-sheet-on')
      document.title = fileTitle
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      if (!cancelled) window.print()
    })()
    return () => {
      cancelled = true
      window.removeEventListener('afterprint', restoreTitle)
      html.classList.remove('print-sheet-on')
      restoreTitle()
    }
    // 인쇄 요청 1번 = 마운트 1번 (부모가 key로 새로 마운트)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <div ref={ref} className="print-root" aria-hidden="true">
      <header className="ps-head">
        <div className="ps-meta">정보관리기술사 · {domainName(topic.domain)}</div>
        <h1>{topic.title}</h1>
        {topic.title_en && topic.title_en !== topic.title && <div className="ps-en">{topic.title_en}</div>}
        {qs.length > 0 && (
          <div className="ps-meta">기출: {qs.map((q) => `${q.round}회 ${q.session}교시`).join(', ')}</div>
        )}
      </header>
      {forms.map((f, i) => {
        const md = answers[f]
        if (!md) return null
        const q = latestQuestion(qs, f)
        return (
          <section key={f} className={i > 0 ? 'ps-sec ps-break' : 'ps-sec'}>
            <h2 className="ps-form">
              {i > 0 && <span className="ps-form-topic">{topic.title} — </span>}
              {FORM_LABEL[f]}
            </h2>
            {q && (
              <p className="ps-q exam-text">
                {q.text}
                <span className="ps-q-src"> (제{q.round}회 {q.session}교시 {q.number}번)</span>
              </p>
            )}
            <AnswerView markdown={md} light />
          </section>
        )
      })}
    </div>,
    document.body,
  )
}
