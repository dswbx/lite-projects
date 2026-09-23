import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

const localFallbackUrl = typeof window === "undefined" ? "http://127.0.0.1:5173" : window.location.origin

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || localFallbackUrl
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "supalite-local-publishable-key"
export const googleOAuthEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true"
export const usesExternalSupabase = new URL(supabaseUrl).origin !== new URL(localFallbackUrl).origin

export function withLiteStorageCompatibility(baseFetch: typeof fetch): typeof fetch {
  return async (input, init) => {
    const response = await baseFetch(input, init)
    const url = input instanceof Request ? input.url : String(input)
    if (!url.includes('/storage/v1/object/sign/') || !response.ok) return response
    const body = await response.clone().json().catch(() => null) as { signedUrl?: string; signedURL?: string } | null
    if (!body?.signedUrl || body.signedURL) return response
    const headers = new Headers(response.headers)
    headers.delete('content-length')
    const upstreamPath = body.signedUrl.replace(/^https?:\/\/[^/]+\/storage\/v1/, '').replace(/^\/storage\/v1/, '')
    return new Response(JSON.stringify({ ...body, signedURL: upstreamPath }), {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}

export function createSignalDeskClient(url = supabaseUrl, anonKey = supabaseAnonKey): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, {
    global: { fetch: withLiteStorageCompatibility(fetch) },
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storageKey: "signal-desk-auth",
    },
  })
}

export const supabase = createSignalDeskClient()
