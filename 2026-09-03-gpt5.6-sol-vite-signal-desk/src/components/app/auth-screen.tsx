import { useState, type FormEvent } from 'react'
import { AlertCircleIcon, ArrowRightIcon, CheckCircle2Icon, LogInIcon, RadioTowerIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'

const googleEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true'

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
    setLoading(false)
    if (result.error) return setError(result.error.message)
    if (mode === 'signup' && !result.data.session) setPendingEmail(email)
  }

  async function signInWithGoogle() {
    if (!googleEnabled) return
    setLoading(true)
    setError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) {
      setError(oauthError.message)
      setLoading(false)
    }
  }

  async function resendConfirmation() {
    if (!pendingEmail) return
    setLoading(true)
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup', email: pendingEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    setError(resendError?.message ?? null)
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
      <section className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,var(--sidebar-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--sidebar-border)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground"><RadioTowerIcon aria-hidden="true" /></span>
          <span className="text-lg font-semibold tracking-tight">Signal Desk</span>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.22em] text-sidebar-foreground/60">Revenue operations, in focus</p>
          <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.04em]">See the signal before the quarter moves.</h1>
          <p className="mt-6 max-w-lg text-lg leading-7 text-sidebar-foreground/70">Accounts, conversations, pipeline risk, quotes, and follow-up work stay connected in one local workspace.</p>
        </div>
        <div className="relative grid grid-cols-3 gap-3 font-mono text-xs text-sidebar-foreground/65"><span>LOCAL DATA</span><span>ROLE AWARE</span><span>UPGRADE READY</span></div>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-10">
        <Card className="w-full max-w-md border-border/80 shadow-xl shadow-primary/5">
          <CardHeader>
            <div className="mb-4 flex items-center gap-2 lg:hidden"><RadioTowerIcon className="text-primary" aria-hidden="true" /><span className="font-semibold">Signal Desk</span></div>
            <CardTitle>{pendingEmail ? 'Check your email' : 'Open your sales desk'}</CardTitle>
            <CardDescription>{pendingEmail ? `We sent a confirmation link to ${pendingEmail}.` : 'Use your team account or create a local workspace.'}</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingEmail ? (
              <div className="flex flex-col gap-4">
                <Alert><CheckCircle2Icon aria-hidden="true" /><AlertTitle>Confirmation required</AlertTitle><AlertDescription>The local server prints the email and its link in the terminal. Open that link to continue.</AlertDescription></Alert>
                {error && <AuthError message={error} />}
                <Button variant="outline" onClick={resendConfirmation} disabled={loading}>{loading && <Spinner data-icon="inline-start" />} Resend confirmation</Button>
                <Button variant="ghost" onClick={() => setPendingEmail(null)}>Back to sign in</Button>
              </div>
            ) : (
              <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
                <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="signin">Sign in</TabsTrigger><TabsTrigger value="signup">Create account</TabsTrigger></TabsList>
                <TabsContent value={mode} className="mt-5">
                  <form onSubmit={submit}>
                    <FieldGroup>
                      {mode === 'signup' && <Field><FieldLabel htmlFor="full-name">Full name</FieldLabel><Input id="full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required autoComplete="name" /></Field>}
                      <Field data-invalid={Boolean(error)}><FieldLabel htmlFor="email">Work email</FieldLabel><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" aria-invalid={Boolean(error)} /></Field>
                      <Field data-invalid={Boolean(error)}><FieldLabel htmlFor="password">Password</FieldLabel><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} aria-invalid={Boolean(error)} />{mode === 'signup' && <FieldDescription>Use at least 10 characters.</FieldDescription>}{error && <FieldError>{error}</FieldError>}</Field>
                      <Button type="submit" disabled={loading} className="w-full">{loading ? <Spinner data-icon="inline-start" /> : <ArrowRightIcon data-icon="inline-end" />}{mode === 'signin' ? 'Sign in' : 'Create account'}</Button>
                    </FieldGroup>
                  </form>
                  <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">OR</div>
                  <Button type="button" variant="outline" className="w-full" onClick={signInWithGoogle} disabled={!googleEnabled || loading}><LogInIcon data-icon="inline-start" /> Continue with Google</Button>
                  {!googleEnabled && <Alert className="mt-4"><AlertCircleIcon aria-hidden="true" /><AlertTitle>Google sign-in is not configured</AlertTitle><AlertDescription>Set the Google provider values and `VITE_GOOGLE_AUTH_ENABLED=true` to enable this button.</AlertDescription></Alert>}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

function AuthError({ message }: { message: string }) {
  return <Alert variant="destructive"><AlertCircleIcon aria-hidden="true" /><AlertTitle>Account action failed</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>
}
