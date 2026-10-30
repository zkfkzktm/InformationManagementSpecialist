import { Fragment } from 'react'

const KEYWORDS = new Set([
  'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or',
  'break', 'continue', 'pass', 'yield', 'lambda', 'with', 'as', 'try', 'except', 'finally', 'raise',
  'True', 'False', 'None', 'global', 'nonlocal',
])

/** 줄에서 문자열 밖의 첫 # 위치 (없으면 -1) */
function commentStart(line: string) {
  let quote: string | null = null
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quote) {
      if (c === '\\') i++
      else if (c === quote) quote = null
    } else if (c === '"' || c === "'") quote = c
    else if (c === '#') return i
  }
  return -1
}

function Code({ text }: { text: string }) {
  // 단어 단위로 나눠 예약어만 강조
  return (
    <>
      {text.split(/(\b[A-Za-z_]+\b)/).map((w, i) =>
        KEYWORDS.has(w) ? <span key={i} className="pc-kw">{w}</span> : <Fragment key={i}>{w}</Fragment>,
      )}
    </>
  )
}

/** 슈도코드 블록: 줄 번호 + 예약어·주석 강조 (Python 비슷한 문법 기준) */
export default function Pseudocode({ code }: { code: string }) {
  const lines = code.replace(/\s+$/, '').split('\n')
  return (
    <pre className="pseudo">
      <code>
        {lines.map((line, n) => {
          const c = commentStart(line)
          return (
            <span key={n} className="pc-line">
              <span className="pc-no" aria-hidden="true">{n + 1}</span>
              {c < 0 ? (
                <Code text={line} />
              ) : (
                <>
                  <Code text={line.slice(0, c)} />
                  <span className="pc-cm">{line.slice(c)}</span>
                </>
              )}
              {'\n'}
            </span>
          )
        })}
      </code>
    </pre>
  )
}
