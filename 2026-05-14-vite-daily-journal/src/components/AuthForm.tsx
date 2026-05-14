import { useState } from 'react'
import { supabase } from '../supabase'

export function AuthForm() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    const { error } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) setErr(error.message)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode('sign-in')}
          className={`rounded-lg px-3 py-1.5 font-medium ${
            mode === 'sign-in'
              ? 'bg-teal-700 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('sign-up')}
          className={`rounded-lg px-3 py-1.5 font-medium ${
            mode === 'sign-up'
              ? 'bg-teal-700 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Sign up
        </button>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
        />
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {busy ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
