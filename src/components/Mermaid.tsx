import { useEffect, useId, useRef, useState } from 'react'

const FONT = '"Pretendard Variable", Pretendard, sans-serif'
const MIN_SCALE = 0.7

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
        // 시퀀스 다이어그램은 글꼴 설정이 따로 있음(기본 trebuchet) → 측정·표시 글꼴을 맞춰야 노트 글자가 박스 밖으로 안 나감
        sequence: { actorFontFamily: FONT, noteFontFamily: FONT, messageFontFamily: FONT },
        securityLevel: 'strict',
      })
      return m.default
    })
  return mermaidPromise
}

/**
 * 시퀀스 다이어그램에서 두 참여자에 걸친 노트(Note over A,B)는 폭이 참여자 간격으로 고정돼
 * 긴 글자가 박스 밖으로 나감 → 노트 앞에 wrap: 을 붙여 박스 폭에 맞춰 줄바꿈
 */
function prepare(code: string) {
  if (!/^\s*sequenceDiagram/.test(code)) return code
  return code.replace(/^(\s*note\s+over\s+[^:\n]+,[^:\n]+):\s*(?!:?wrap:)/gim, '$1:wrap:')
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
  const [wide, setWide] = useState(false) // 화면보다 넓어 가로 스크롤이 생겼는지
  useEffect(() => {
    const box = ref.current
    if (!box || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setWide(box.scrollWidth > box.clientWidth + 4))
    ro.observe(box)
    return () => ro.disconnect()
  }, [failed])
  useEffect(() => {
    let alive = true
    Promise.all([loadMermaid(), loadFontFor(code)])
      // 측정용 임시 요소를 같은 자리(.answer 안)에 만들어 실제 표시 CSS와 같은 조건으로 크기 계산
      .then(([m]) => m.render(`mm${id}`, (light ? LIGHT : '') + prepare(code), ref.current ?? undefined))
      .then(({ svg }) => {
        if (!alive || !ref.current) return
        ref.current.innerHTML = svg
        // 좁은 화면: 원래 크기의 70%까지만 줄이고, 그보다 좁으면 가로 스크롤 (글자가 읽을 수 없게 작아지는 것 방지)
        const el = ref.current.querySelector('svg')
        const natural = parseFloat(el?.style.maxWidth ?? '') || el?.viewBox.baseVal.width || 0
        if (el && natural) el.style.minWidth = `${Math.round(natural * MIN_SCALE)}px`
        setWide(ref.current.scrollWidth > ref.current.clientWidth + 4)
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [code, id, light])
  if (failed) return <pre>{code}</pre>
  return (
    <>
      <div ref={ref} className="diagram" />
      {wide && <p className="diagram-hint">좌우로 밀어서 전체 보기 ↔</p>}
    </>
  )
}
