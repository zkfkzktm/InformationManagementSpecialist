import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getData } from '../lib/data'
import Mermaid from './Mermaid'

/** [[kw-id|표시]] 또는 [[kw-id]] → 위키 링크. 존재하지 않는 키워드는 일반 텍스트로. */
export function linkKeywords(md: string): string {
  const { keywordById } = getData()
  return md.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, id: string, label?: string) => {
    const kw = keywordById.get(id.trim())
    const text = label ?? kw?.term ?? id
    return kw ? `[${text}](#/wiki/${kw.id})` : text
  })
}

export default function AnswerView({ markdown }: { markdown: string }) {
  return (
    <div className="answer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ className, children, ...rest }) => {
            if (className === 'language-mermaid') return <Mermaid code={String(children).trim()} />
            return (
              <code className={className} {...rest}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => {
            // mermaid 블록은 <pre> 없이 렌더
            const child = children as { props?: { className?: string } } | undefined
            if (child?.props?.className === 'language-mermaid') return <>{children}</>
            return <pre>{children}</pre>
          },
          a: ({ href, children }) =>
            href?.startsWith('#/wiki/') ? (
              <a href={href} className="kw">
                {children}
              </a>
            ) : (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            ),
        }}
      >
        {linkKeywords(markdown)}
      </ReactMarkdown>
    </div>
  )
}
