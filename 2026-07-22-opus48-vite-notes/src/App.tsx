import { useAuth } from './useAuth'
import { Auth } from './Auth'
import { Notes } from './Notes'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        Loading…
      </div>
    )
  }

  if (!session) return <Auth />

  return <Notes user={session.user} />
}
