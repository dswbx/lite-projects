import { createClient } from "@supabase/supabase-js"

// Run after the API is serving with Storage enabled:
// bun run dev
// SUPABASE_URL=http://127.0.0.1:5173 bun supabase/seed-storage.ts
// The script uses only the public supabase-js Storage API and is idempotent.
const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:5173"
const secretKey = process.env.SUPABASE_SECRET_KEY
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
if (!secretKey || !publishableKey) {
  throw new Error("SUPABASE_SECRET_KEY and SUPABASE_PUBLISHABLE_KEY are required")
}

const admin = createClient(url, secretKey, { auth: { persistSession: false } })
const { error: bucketError } = await admin.storage.createBucket("crm-files", {
  public: false,
  fileSizeLimit: 10 * 1024 * 1024,
  allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg", "text/csv", "text/plain"],
})
if (bucketError && !bucketError.message.toLowerCase().includes("already exists")) throw bucketError

const samples = [
  ["ws-atlas", "10000000-0000-4000-8000-000000000001", "alex@signaldesk.local"],
  ["ws-polaris", "10000000-0000-4000-8000-000000000002", "sam@signaldesk.local"],
  ["ws-lantern", "10000000-0000-4000-8000-000000000003", "jamie@signaldesk.local"],
] as const
for (let index = 1; index <= 18; index += 1) {
  const [workspace, user, email] = samples[(index - 1) % samples.length]
  const client = createClient(url, publishableKey, { auth: { persistSession: false } })
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: "SignalDesk123!",
  })
  if (signInError) throw signInError

  const path = `${workspace}/${user}/opportunity/opportunity-${index}-deal-room-notes.txt`
  const content = `Deal room notes for opportunity ${index}\n\nDecision team: Finance, Operations, and Security\nNext milestone: mutual action plan review\nOpen question: regional data residency\nOwner: ${email}\n`
  const body = new TextEncoder().encode(content.padEnd(256 + index, " "))
  const { error } = await client.storage.from("crm-files").upload(
    path,
    body,
    { contentType: "text/plain", upsert: true },
  )
  if (error) throw error
}
console.log("Seeded 18 crm-files attachments")
