/** Supabase 클라이언트. 환경변수 없으면 null → 로컬 전용 모드. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { flowType: 'pkce', persistSession: true } }) : null

export const syncAvailable = supabase !== null
