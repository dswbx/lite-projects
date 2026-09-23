import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { appError, fail, ok } from "@/lib/errors"
import { googleOAuthEnabled, supabase } from "@/lib/supabase"
import type { Result } from "@/lib/domain"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface SignUpInput {
  email: string
  password: string
  fullName: string
  redirectTo?: string
}

export interface SignInInput {
  email: string
  password: string
}

export interface AuthService {
  signUp(input: SignUpInput): Promise<Result<{ user: User | null; session: Session | null; confirmationRequired: boolean }>>
  resendVerification(email: string, redirectTo?: string): Promise<Result<void>>
  signIn(input: SignInInput): Promise<Result<{ user: User; session: Session }>>
  signInWithGoogle(redirectTo?: string): Promise<Result<{ url: string | null }>>
  exchangeCodeForSession(code: string): Promise<Result<Session>>
  getSession(): Promise<Result<Session | null>>
  signOut(): Promise<Result<void>>
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void
}

function callbackUrl(path = "/auth/callback"): string {
  if (typeof window === "undefined") return `http://127.0.0.1:5173${path}`
  return new URL(path, window.location.origin).toString()
}

export function createAuthService(
  client: SupabaseClient<Database> = supabase,
  options: { googleEnabled?: boolean } = {},
): AuthService {
  const isGoogleEnabled = options.googleEnabled ?? googleOAuthEnabled

  return {
    async signUp(input) {
      const { data, error } = await client.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: { full_name: input.fullName },
          emailRedirectTo: input.redirectTo ?? callbackUrl(),
        },
      })
      if (error) return fail(error, "Unable to create your account")
      return ok({ user: data.user, session: data.session, confirmationRequired: data.session === null })
    },

    async resendVerification(email, redirectTo) {
      const { error } = await client.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectTo ?? callbackUrl() },
      })
      return error ? fail(error, "Unable to resend the verification email") : ok(undefined)
    },

    async signIn(input) {
      const { data, error } = await client.auth.signInWithPassword(input)
      if (error) return fail(error, "Unable to sign in")
      if (!data.user || !data.session) return fail(appError("authentication", "Sign-in did not return a session"))
      return ok({ user: data.user, session: data.session })
    },

    async signInWithGoogle(redirectTo) {
      if (!isGoogleEnabled) {
        return fail(appError(
          "configuration",
          "Google sign-in is not configured. Set VITE_GOOGLE_AUTH_ENABLED=true after adding Google credentials to supabase/config.toml.",
        ))
      }
      const { data, error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo ?? callbackUrl(),
          skipBrowserRedirect: false,
        },
      })
      return error ? fail(error, "Unable to start Google sign-in") : ok({ url: data.url })
    },

    async exchangeCodeForSession(code) {
      const { data, error } = await client.auth.exchangeCodeForSession(code)
      if (error) return fail(error, "Unable to finish sign-in")
      return ok(data.session)
    },

    async getSession() {
      const { data, error } = await client.auth.getSession()
      return error ? fail(error, "Unable to restore your session") : ok(data.session)
    },

    async signOut() {
      const { error } = await client.auth.signOut({ scope: "local" })
      return error ? fail(error, "Unable to sign out") : ok(undefined)
    },

    onAuthStateChange(callback) {
      const { data } = client.auth.onAuthStateChange(callback)
      return () => data.subscription.unsubscribe()
    },
  }
}

export const authService = createAuthService()
