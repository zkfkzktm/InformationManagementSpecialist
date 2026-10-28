import { useEffect, useState } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider } from './lib/auth'
import { loadAll } from './lib/data'
import Home from './pages/Home'
import ListPage from './pages/ListPage'
import ReviewPage from './pages/ReviewPage'
import SettingsPage from './pages/SettingsPage'
import TopicPage from './pages/TopicPage'
import WikiPage from './pages/WikiPage'

export default function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    loadAll()
      .then(() => setReady(true))
      .catch((e) => setError(e.message))
  }, [])

  if (error)
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-center text-ink-2">
        데이터를 불러오지 못했습니다. 새로고침해 주세요.
        <br />
        <span className="text-xs text-ink-3">{error}</span>
      </div>
    )
  if (!ready) return <div className="min-h-dvh flex items-center justify-center text-ink-3 text-sm">불러오는 중…</div>

  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="topics" element={<ListPage />} />
            <Route path="topic/:id" element={<TopicPage />} />
            <Route path="wiki/:id" element={<WikiPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
