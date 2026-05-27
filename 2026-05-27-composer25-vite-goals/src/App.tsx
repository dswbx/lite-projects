import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthScreen } from './components/AuthScreen'
import { GoalDashboard } from './components/GoalDashboard'

function AppShell() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-ink-muted">Loading…</p>
      </div>
    )
  }

  if (!user) return <AuthScreen />

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <GoalDashboard />
    </main>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
