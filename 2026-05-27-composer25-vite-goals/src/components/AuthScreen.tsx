import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const message =
      mode === 'signin'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password)
    if (message) setError(message)
    setBusy(false)
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <p className="font-display text-sm font-medium tracking-wide text-moss uppercase">
        Northstar
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold text-ink">
        {mode === 'signin' ? 'Welcome back' : 'Create your space'}
      </h1>
      <p className="mt-3 text-ink-muted">
        Sign in to track goals and milestones. Your data stays private to your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-ink-muted">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-white/70 px-3 py-2.5 text-ink outline-none ring-moss/30 focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink-muted">Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-white/70 px-3 py-2.5 text-ink outline-none ring-moss/30 focus:ring-2"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-clay/15 px-3 py-2 text-sm text-clay" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-moss px-4 py-3 font-medium text-paper transition hover:bg-moss-light disabled:opacity-60"
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin')
          setError(null)
        }}
        className="mt-4 text-sm text-moss underline-offset-2 hover:underline"
      >
        {mode === 'signin'
          ? 'Need an account? Sign up'
          : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
