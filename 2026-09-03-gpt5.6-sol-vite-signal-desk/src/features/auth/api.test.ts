import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"
import type { Database } from "@/lib/database.types"
import { createAuthService } from "./api"

describe("auth service", () => {
  it("explains how to enable Google without calling OAuth while disabled", async () => {
    const signInWithOAuth = vi.fn()
    const client = { auth: { signInWithOAuth } } as unknown as SupabaseClient<Database>
    const result = await createAuthService(client, { googleEnabled: false }).signInWithGoogle()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("configuration")
    expect(signInWithOAuth).not.toHaveBeenCalled()
  })

  it("reports that email confirmation is required when signup has no session", async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { user: { id: "u1" }, session: null }, error: null })
    const client = { auth: { signUp } } as unknown as SupabaseClient<Database>
    const result = await createAuthService(client).signUp({ email: "ana@example.test", password: "strong-password", fullName: "Ana" })
    expect(result.ok && result.data.confirmationRequired).toBe(true)
  })
})
