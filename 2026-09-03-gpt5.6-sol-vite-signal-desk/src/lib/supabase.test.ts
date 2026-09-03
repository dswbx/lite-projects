import { describe, expect, it, vi } from 'vitest'
import { withLiteStorageCompatibility } from './supabase'

describe('Supalite Storage response compatibility', () => {
  it('maps the lowercase signed URL key to the upstream key expected by storage-js', async () => {
    const baseFetch = vi.fn(async () => new Response(JSON.stringify({ signedUrl: '/storage/v1/object/sign/crm-files/avatar?token=redacted' }), {
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch

    const response = await withLiteStorageCompatibility(baseFetch)('http://localhost/storage/v1/object/sign/crm-files/avatar', { method: 'POST' })

    await expect(response.json()).resolves.toEqual({
      signedUrl: '/storage/v1/object/sign/crm-files/avatar?token=redacted',
      signedURL: '/object/sign/crm-files/avatar?token=redacted',
    })
  })

  it('does not rewrite unrelated responses', async () => {
    const original = new Response('{}')
    const baseFetch = vi.fn(async () => original) as unknown as typeof fetch

    await expect(withLiteStorageCompatibility(baseFetch)('http://localhost/rest/v1/accounts')).resolves.toBe(original)
  })
})
