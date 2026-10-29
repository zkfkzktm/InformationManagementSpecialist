import { useAuth } from '../lib/auth'
import { getData } from '../lib/data'
import { useSyncExternalStore } from 'react'
import { clearLocal, getPushError, subscribe } from '../lib/progress'
import { syncAvailable } from '../lib/supabase'
import { useAllProgress } from '../lib/useProgress'

export default function SettingsPage() {
  const { user, loading, syncError, signIn, signOut } = useAuth()
  const pushError = useSyncExternalStore(subscribe, getPushError)
  const { topics, questions, keywords } = getData()
  const progress = useAllProgress()
  const withAnswer = topics.filter((t) => t.has_answer).length

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-sheet border border-rule rounded-sm p-4 flex flex-col gap-3">
        <h2 className="m-0 text-base font-semibold">기기 간 동기화</h2>
        {!syncAvailable ? (
          <p className="m-0 text-sm text-ink-2">
            Supabase 설정이 없어 이 기기에만 저장됩니다. 배포 시 <code>VITE_SUPABASE_URL</code>,{' '}
            <code>VITE_SUPABASE_ANON_KEY</code>를 넣으면 Google 로그인으로 동기화됩니다.
          </p>
        ) : loading ? (
          <p className="m-0 text-sm text-ink-2">확인 중…</p>
        ) : user ? (
          <>
            <p className="m-0 text-sm">
              {user.email} 로 로그인됨. 북마크·자신감이 자동 동기화됩니다.
            </p>
            {(syncError || pushError) && (
              <p className="m-0 text-sm text-stamp">동기화 오류: {syncError ?? pushError}</p>
            )}
            <button type="button" onClick={signOut} className="self-start px-3 py-1.5 rounded-md border border-rule text-sm">
              로그아웃
            </button>
          </>
        ) : (
          <>
            <p className="m-0 text-sm text-ink-2">로그인하면 PC와 모바일에서 진도가 이어집니다.</p>
            <button type="button" onClick={signIn} className="self-start px-4 py-2 rounded-md bg-ink text-paper text-sm font-semibold">
              Google로 로그인
            </button>
          </>
        )}
      </section>

      <section className="bg-sheet border border-rule rounded-sm p-4 flex flex-col gap-2 text-sm">
        <h2 className="m-0 text-base font-semibold">데이터</h2>
        <table className="text-sm">
          <tbody>
            <tr><td className="pr-4 text-ink-2">기출 문항</td><td>{questions.length.toLocaleString()}개</td></tr>
            <tr><td className="pr-4 text-ink-2">토픽</td><td>{topics.length.toLocaleString()}개 (답안 있음 {withAnswer})</td></tr>
            <tr><td className="pr-4 text-ink-2">키워드 위키</td><td>{keywords.length.toLocaleString()}개</td></tr>
            <tr><td className="pr-4 text-ink-2">학습 기록</td><td>{Object.keys(progress).length}개 토픽</td></tr>
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => {
            if (confirm('이 기기의 학습 기록을 지웁니다. 로그인 상태면 서버 기록은 남습니다.')) clearLocal()
          }}
          className="self-start mt-1 px-3 py-1.5 rounded-md border border-rule text-ink-2"
        >
          이 기기 기록 지우기
        </button>
      </section>
    </div>
  )
}
