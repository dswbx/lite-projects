import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup'

export function AuthPanel() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)

    const result =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })

    setBusy(false)

    if (result.error) {
      setMessage(result.error.message)
      return
    }

    if (mode === 'signup') {
      setMessage('Account created. You are signed in.')
      setMode('signin')
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-panel-edge bg-panel/90 p-8 shadow-2xl backdrop-blur-sm">
      <p className="font-display text-xs uppercase tracking-[0.35em] text-amber">
        Private screening room
      </p>
      <h1 className="mt-2 font-display text-4xl font-medium text-cream">
        Movie Watchlist
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Sign in to keep your queue. Each account only sees its own films; nothing
        leaves this browser except through your login.
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-left text-sm text-muted">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-panel-edge bg-ink px-3 py-2.5 text-cream outline-none ring-amber/40 focus:ring-2"
          />
        </label>
        <label className="block text-left text-sm text-muted">
          Password
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-panel-edge bg-ink px-3 py-2.5 text-cream outline-none ring-amber/40 focus:ring-2"
          />
        </label>

        {message && (
          <p
            className={`text-sm ${message.includes('created') ? 'text-amber' : 'text-crimson'}`}
            role="alert"
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-amber px-4 py-3 font-medium text-ink transition hover:bg-amber-dim disabled:opacity-60"
        >
          {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin')
          setMessage(null)
        }}
        className="mt-4 w-full text-sm text-muted underline-offset-4 hover:text-cream hover:underline"
      >
        {mode === 'signin'
          ? 'Need an account? Sign up'
          : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
