import { Link, useParams } from 'react-router-dom'
import { getData } from '../lib/data'

export default function WikiPage() {
  const { id = '' } = useParams()
  const { keywordById, topicById } = getData()
  const kw = keywordById.get(id)
  if (!kw)
    return (
      <div className="py-16 text-center text-ink-2">
        아직 설명이 없는 키워드입니다. <Link to="/">출제로</Link>
      </div>
    )
  const related = kw.related.map((r) => keywordById.get(r)).filter((k) => !!k)
  const topics = kw.topic_ids.map((t) => topicById.get(t)).filter((t) => !!t)

  return (
    <article className="flex flex-col gap-5">
      <header>
        <div className="text-sm text-ink-3">키워드</div>
        <h1 className="text-xl font-bold m-0 leading-snug">{kw.term}</h1>
        {kw.term_en && <div className="text-sm text-ink-2">{kw.term_en}</div>}
      </header>

      <p className="m-0 text-[0.95rem] leading-7 word-break-keep">{kw.definition}</p>

      {kw.features.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink-2 m-0 mb-1.5">핵심 특징</h2>
          <ul className="m-0 pl-5 leading-7 text-[0.95rem] list-disc">
            {kw.features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink-2 m-0 mb-1.5">관련 키워드</h2>
          <div className="flex flex-wrap gap-1.5">
            {related.map((k) => (
              <Link key={k.id} to={`/wiki/${k.id}`} className="px-2 py-0.5 rounded-md bg-pen-soft text-pen text-sm no-underline">
                {k.term}
              </Link>
            ))}
          </div>
        </section>
      )}

      {topics.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink-2 m-0 mb-1.5">등장 토픽</h2>
          <ul className="m-0 p-0 list-none flex flex-col gap-1">
            {topics.map((t) => (
              <li key={t.id}>
                <Link to={`/topic/${t.id}`} className="block px-3 py-2 bg-sheet border border-rule rounded-sm no-underline text-ink">
                  {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
