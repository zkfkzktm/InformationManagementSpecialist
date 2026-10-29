/** 인증 컨텍스트: Supabase Google OAuth. 로그인되면 progress.syncWithRemote 실행. */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { setUser, syncWithRemote } from './progress'

interface AuthCtx {
  user: User | null
  loading: boolean
  syncError: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: false,
  syncError: null,
  signIn: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [loading, setLoading] = useState(!!supabase)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    const apply = async (u: User | null) => {
      setUserState(u)
      setUser(u?.id ?? null)
      if (u) {
        try {
          await syncWithRemote(u.id)
          setSyncError(null)
        } catch (e) {
          setSyncError(e instanceof Error ? e.message : String(e))
        }
      }
      setLoading(false)
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user ?? null))
    // 콜백 안에서 Supabase 호출 금지(인증 잠금 교착 방지) → 다음 틱으로 미룸
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT')
        setTimeout(() => void apply(session?.user ?? null), 0)
    })
    // 다른 기기에서 공부한 기록 반영: 앱으로 돌아올 때 재동기화 (1분 간격 제한)
    let last = 0
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 60_000) return
      last = Date.now()
      void supabase!.auth.getSession().then(({ data }) => {
        if (data.session?.user) void apply(data.session.user)
      })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      sub.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const signIn = async () => {
    if (!supabase) return
    const redirectTo = window.location.origin + window.location.pathname
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
  }
  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setUserState(null)
  }

  return <Ctx.Provider value={{ user, loading, syncError, signIn, signOut }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
