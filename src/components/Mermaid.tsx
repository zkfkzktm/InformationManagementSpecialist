import { useEffect, useId, useRef, useState } from 'react'

const FONT = '"Pretendard Variable", Pretendard, sans-serif'

let mermaidPromise: Promise<typeof import('mermaid')['default']> | null = null
function loadMermaid() {
  if (!mermaidPromise)
    mermaidPromise = import('mermaid').then((m) => {
      const dark = document.documentElement.dataset.theme === 'dark' ||
        (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
      m.default.initialize({
        startOnLoad: false,
        theme: dark ? 'dark' : 'neutral',
        fontFamily: FONT,
        htmlLabels: true,
        // wrappingWidth: mermaid 12 기본 120px → 짧은 라벨도 '·' 뒤에서 줄바꿈되는 문제
        flowchart: { curve: 'basis', wrappingWidth: 220, nodeSpacing: 30, rankSpacing: 50, padding: 12 },
        securityLevel: 'strict',
      })
      return m.default
    })
  return mermaidPromise
}

/** 라벨 글자가 든 웹폰트 조각(unicode-range)을 먼저 받아야 박스 크기가 맞음 */
function loadFontFor(code: string) {
  if (!document.fonts?.load) return Promise.resolve()
  const chars = Array.from(new Set(code.replace(/\s/g, ''))).join('')
  return Promise.race([
    Promise.all([document.fonts.load(`16px ${FONT}`, chars), document.fonts.load(`bold 16px ${FONT}`, chars)]),
    new Promise((r) => setTimeout(r, 3000)),
  ]).catch(() => undefined)
}

// 다이어그램별 설정(frontmatter)으로 전역 테마(다크일 수 있음)를 덮어씀
const LIGHT = '---\nconfig:\n  theme: neutral\n---\n'

/** 구성도: mermaid 코드 → SVG. 실패하면 원문 코드를 그대로 보여줌. light = 인쇄용 밝은 테마 */
export default function Mermaid({ code, light }: { code: string; light?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    Promise.all([loadMermaid(), loadFontFor(code)])
      // 측정용 임시 요소를 같은 자리(.answer 안)에 만들어 실제 표시 CSS와 같은 조건으로 크기 계산
      .then(([m]) => m.render(`mm${id}`, light ? LIGHT + code : code, ref.current ?? undefined))
      .then(({ svg }) => {
        if (alive && ref.current) ref.current.innerHTML = svg
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [code, id, light])
  if (failed) return <pre>{code}</pre>
  return <div ref={ref} className="diagram" />
}
