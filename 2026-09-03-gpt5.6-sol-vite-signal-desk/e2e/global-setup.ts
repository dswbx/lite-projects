import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

export default async function globalSetup() {
  if (process.env.VITE_SUPABASE_URL) return

  const env = loadEnv('development', process.cwd(), '')
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SECRET_KEY
  if (!secretKey) throw new Error('SUPABASE_SECRET_KEY is required to prepare the local private Storage bucket.')

  const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173'
  const admin = createClient(baseURL, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const current = await admin.storage.getBucket('crm-files')
  if (current.data) return
  if (current.error && !current.error.message.toLowerCase().includes('not found')) throw current.error

  const created = await admin.storage.createBucket('crm-files', {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'text/csv', 'text/plain'],
  })
  if (created.error) throw created.error
}
