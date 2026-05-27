import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const result =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })

    setBusy(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    if (mode === 'signup' && !result.data.session) {
      setError('Account created. Sign in with your email and password.')
      setMode('signin')
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.35em] text-ember">
        Iron Log
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-tight text-chalk">
        Your training,<br />your data
      </h1>
      <p className="mt-3 text-sm text-muted">
        Sign in to log sets and browse your workout history. Everything stays in your
        browser on this device.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-4">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-steel bg-slate px-4 py-3 text-chalk outline-none ring-ember/40 focus:border-ember focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Password
          </span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-steel bg-slate px-4 py-3 text-chalk outline-none ring-ember/40 focus:border-ember focus:ring-2"
          />
        </label>

        {error && (
          <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-ember py-3 font-display text-lg font-semibold uppercase tracking-wide text-iron transition hover:bg-ember-dim disabled:opacity-50"
        >
          {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === 'signin' ? 'New here?' : 'Already training with us?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
          }}
          className="font-medium text-ember underline-offset-2 hover:underline"
        >
          {mode === 'signin' ? 'Create an account' : 'Sign in instead'}
        </button>
      </p>
    </div>
  )
}
