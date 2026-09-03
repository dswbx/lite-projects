import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import { loadEnv } from 'vite'
import { demoUsers, uniqueValue } from './helpers'

type Client = SupabaseClient
const localEnv = loadEnv('development', process.cwd(), '')

function apiUrl(baseURL: string | undefined): string {
  return process.env.VITE_SUPABASE_URL ?? baseURL ?? 'http://127.0.0.1:5173'
}

function apiKey(): string {
  return process.env.VITE_SUPABASE_ANON_KEY
    ?? process.env.SUPABASE_PUBLISHABLE_KEY
    ?? localEnv.SUPABASE_PUBLISHABLE_KEY
    ?? 'supalite-local-publishable-key'
}

async function authenticatedClient(user: (typeof demoUsers)[keyof typeof demoUsers], baseURL?: string): Promise<{ client: Client; userId: string }> {
  const client = createClient(apiUrl(baseURL), apiKey(), { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await client.auth.signInWithPassword(user)
  expect(error).toBeNull()
  expect(data.user).not.toBeNull()
  return { client, userId: data.user!.id }
}

test.describe('tenant RLS through the real Data API', () => {
  test('profiles are visible only to the user and active shared-workspace members', async ({ baseURL }) => {
    const atlasOwner = await authenticatedClient(demoUsers.owner, baseURL)
    const polarisMember = await authenticatedClient(demoUsers.member, baseURL)

    const atlasProfiles = await atlasOwner.client.from('profiles').select('email')
    expect(atlasProfiles.error).toBeNull()
    expect(atlasProfiles.data?.map((profile) => profile.email).sort()).toEqual([
      demoUsers.owner.email,
      demoUsers.manager.email,
    ].sort())

    const polarisProfiles = await polarisMember.client.from('profiles').select('email')
    expect(polarisProfiles.error).toBeNull()
    expect(polarisProfiles.data?.map((profile) => profile.email).sort()).toEqual([
      demoUsers.manager.email,
      demoUsers.member.email,
    ].sort())
  })

  test('a workspace member cannot read or change another workspace account', async ({ baseURL }, testInfo) => {
    const owner = await authenticatedClient(demoUsers.owner, baseURL)
    const outsider = await authenticatedClient(demoUsers.member, baseURL)
    const id = crypto.randomUUID()
    const name = uniqueValue('RLS account', testInfo)

    const created = await owner.client.from('accounts').insert({
      id,
      workspace_id: 'ws-atlas',
      name,
      segment: 'smb',
      lifecycle_stage: 'prospect',
      owner_id: owner.userId,
      created_by: owner.userId,
      created_by_status: 'active',
    }).select('id').single()
    expect(created.error).toBeNull()

    const hidden = await outsider.client.from('accounts').select('id').eq('id', id)
    expect(hidden.error).toBeNull()
    expect(hidden.data).toEqual([])

    const changed = await outsider.client.from('accounts').update({ name: 'Forbidden change' }).eq('id', id).select('id')
    expect(changed.error).toBeNull()
    expect(changed.data).toEqual([])

    const removed = await owner.client.from('accounts').delete().eq('id', id)
    expect(removed.error).toBeNull()
  })

  test('a manager can read and update a sales record in their workspace', async ({ baseURL }, testInfo) => {
    const owner = await authenticatedClient(demoUsers.owner, baseURL)
    const manager = await authenticatedClient(demoUsers.manager, baseURL)
    const id = crypto.randomUUID()
    const name = uniqueValue('Manager account', testInfo)

    const created = await owner.client.from('accounts').insert({
      id,
      workspace_id: 'ws-atlas',
      name,
      segment: 'enterprise',
      lifecycle_stage: 'qualified',
      owner_id: owner.userId,
      created_by: owner.userId,
      created_by_status: 'active',
    })
    expect(created.error).toBeNull()

    const visible = await manager.client.from('accounts').select('id,name').eq('id', id).single()
    expect(visible.error).toBeNull()
    expect(visible.data?.name).toBe(name)
    const updated = await manager.client.from('accounts').update({ industry: 'Manager reviewed' }).eq('id', id).select('industry').single()
    expect(updated.error).toBeNull()
    expect(updated.data?.industry).toBe('Manager reviewed')

    await owner.client.from('accounts').delete().eq('id', id)
  })

  test('a membership foreign key closes the Supalite cross-workspace INSERT check gap', async ({ baseURL }, testInfo) => {
    const outsider = await authenticatedClient(demoUsers.member, baseURL)
    const id = crypto.randomUUID()

    const inserted = await outsider.client.from('accounts').insert({
      id,
      workspace_id: 'ws-atlas',
      name: uniqueValue('Forbidden insert', testInfo),
      segment: 'smb',
      lifecycle_stage: 'prospect',
      owner_id: outsider.userId,
      created_by: outsider.userId,
      created_by_status: 'active',
    })
    expect(inserted.error, 'an outsider insert into Atlas must be rejected').not.toBeNull()
  })

  test('suspension revokes sales inserts, updates, and deletes', async ({ baseURL }, testInfo) => {
    const owner = await authenticatedClient(demoUsers.owner, baseURL)
    const manager = await authenticatedClient(demoUsers.manager, baseURL)
    const id = crypto.randomUUID()
    const created = await manager.client.from('accounts').insert({
      id,
      workspace_id: 'ws-atlas',
      name: uniqueValue('Suspendable account', testInfo),
      segment: 'smb',
      lifecycle_stage: 'prospect',
      owner_id: manager.userId,
      created_by: manager.userId,
      created_by_status: 'active',
    })
    expect(created.error).toBeNull()

    const suspended = await owner.client.from('workspace_members').update({ status: 'suspended' }).eq('workspace_id', 'ws-atlas').eq('user_id', manager.userId)
    expect(suspended.error).toBeNull()
    const inserted = await manager.client.from('accounts').insert({
      id: crypto.randomUUID(),
      workspace_id: 'ws-atlas',
      name: uniqueValue('Suspended insert', testInfo),
      segment: 'smb',
      lifecycle_stage: 'prospect',
      owner_id: manager.userId,
      created_by: manager.userId,
      created_by_status: 'active',
    })
    expect(inserted.error, 'a suspended member cannot forge an active creator status').not.toBeNull()
    const updated = await manager.client.from('accounts').update({ industry: 'Forbidden suspended update' }).eq('id', id).select('id')
    expect(updated.error).toBeNull()
    expect(updated.data).toEqual([])
    const removed = await manager.client.from('accounts').delete().eq('id', id).select('id')
    expect(removed.error).toBeNull()
    expect(removed.data).toEqual([])

    const restored = await owner.client.from('workspace_members').update({ status: 'active' }).eq('workspace_id', 'ws-atlas').eq('user_id', manager.userId)
    expect(restored.error).toBeNull()
    const cleanup = await owner.client.from('accounts').delete().eq('id', id)
    expect(cleanup.error).toBeNull()
  })

  test('a member cannot add or promote workspace memberships', async ({ baseURL }) => {
    const owner = await authenticatedClient(demoUsers.manager, baseURL)
    const member = await authenticatedClient(demoUsers.member, baseURL)
    const inserted = await member.client.from('workspace_members').insert({
      workspace_id: 'ws-atlas',
      workspace_owner_id: owner.userId,
      user_id: member.userId,
      role: 'owner',
      status: 'active',
      created_by: member.userId,
    })
    expect(inserted.error, 'only the workspace owner can add a membership').not.toBeNull()

    const promoted = await member.client.from('workspace_members').update({ role: 'owner' }).eq('workspace_id', 'ws-polaris').eq('user_id', member.userId).select('id')
    expect(promoted.error).toBeNull()
    expect(promoted.data).toEqual([])
    const unchanged = await owner.client.from('workspace_members').select('role').eq('workspace_id', 'ws-polaris').eq('user_id', member.userId).single()
    expect(unchanged.error).toBeNull()
    expect(unchanged.data?.role).toBe('member')
  })

  test('membership role and active status constrain administrative inserts', async ({ baseURL }, testInfo) => {
    const owner = await authenticatedClient(demoUsers.owner, baseURL)
    const manager = await authenticatedClient(demoUsers.manager, baseURL)
    const futureAdmin = await authenticatedClient(demoUsers.member, baseURL)

    const ownerProductId = crypto.randomUUID()
    const ownerInsert = await owner.client.from('products').insert({
      id: ownerProductId,
      workspace_id: 'ws-atlas',
      name: uniqueValue('Owner catalog item', testInfo),
      sku: uniqueValue('OWNER-SKU', testInfo),
      unit_price: 100,
      billing_period: 'one_time',
      is_active: true,
      created_by: owner.userId,
      created_by_role: 'owner',
      created_by_status: 'active',
    })
    expect(ownerInsert.error).toBeNull()

    const adminMembershipId = crypto.randomUUID()
    const adminMembership = await owner.client.from('workspace_members').insert({
      id: adminMembershipId,
      workspace_id: 'ws-atlas',
      workspace_owner_id: owner.userId,
      user_id: futureAdmin.userId,
      role: 'admin',
      status: 'active',
      created_by: owner.userId,
    })
    expect(adminMembership.error).toBeNull()
    const adminUpdate = await futureAdmin.client.from('products').update({ name: uniqueValue('Admin revised item', testInfo) }).eq('id', ownerProductId).select('id')
    expect(adminUpdate.error).toBeNull()
    expect(adminUpdate.data).toHaveLength(1)

    const managerInsert = await manager.client.from('products').insert({
      id: crypto.randomUUID(),
      workspace_id: 'ws-atlas',
      name: uniqueValue('Forbidden manager item', testInfo),
      sku: uniqueValue('MANAGER-SKU', testInfo),
      unit_price: 100,
      billing_period: 'one_time',
      is_active: true,
      created_by: manager.userId,
      created_by_role: 'owner',
      created_by_status: 'active',
    })
    expect(managerInsert.error, 'a manager cannot forge an owner attestation').not.toBeNull()

    const suspended = await manager.client.from('workspace_members').update({ status: 'suspended' }).eq('workspace_id', 'ws-polaris').eq('user_id', manager.userId)
    expect(suspended.error).toBeNull()
    const suspendedInsert = await manager.client.from('products').insert({
      id: crypto.randomUUID(),
      workspace_id: 'ws-polaris',
      name: uniqueValue('Suspended owner item', testInfo),
      sku: uniqueValue('SUSPENDED-SKU', testInfo),
      unit_price: 100,
      billing_period: 'one_time',
      is_active: true,
      created_by: manager.userId,
      created_by_role: 'owner',
      created_by_status: 'active',
    })
    expect(suspendedInsert.error, 'a suspended owner cannot use an active creator attestation').not.toBeNull()
    const restored = await manager.client.from('workspace_members').update({ status: 'active' }).eq('workspace_id', 'ws-polaris').eq('user_id', manager.userId)
    expect(restored.error).toBeNull()
    await owner.client.from('products').delete().eq('id', ownerProductId)
    await owner.client.from('workspace_members').delete().eq('id', adminMembershipId)
  })

  test('audit history is visible to owners and hidden from same-workspace members', async ({ baseURL }, testInfo) => {
    const owner = await authenticatedClient(demoUsers.manager, baseURL)
    const member = await authenticatedClient(demoUsers.member, baseURL)
    const id = crypto.randomUUID()
    const eventId = crypto.randomUUID()
    const summary = uniqueValue('RLS audit', testInfo)

    const inserted = await owner.client.from('audit_events').insert({
      id: eventId,
      workspace_id: 'ws-polaris',
      actor_id: owner.userId,
      created_by: owner.userId,
      created_by_status: 'active',
      action: 'e2e_checked',
      entity_type: 'account',
      entity_id: id,
      summary,
    })
    expect(inserted.error).toBeNull()

    const managerRead = await owner.client.from('audit_events').select('id').eq('workspace_id', 'ws-atlas').limit(1)
    expect(managerRead.error).toBeNull()
    expect(managerRead.data?.length).toBeGreaterThan(0)

    const ownerRead = await owner.client.from('audit_events').select('id').eq('id', eventId)
    expect(ownerRead.error).toBeNull()
    expect(ownerRead.data).toHaveLength(1)
    const memberRead = await member.client.from('audit_events').select('id').eq('id', eventId)
    expect(memberRead.error).toBeNull()
    expect(memberRead.data).toEqual([])

    const changed = await owner.client.from('audit_events').update({ summary: 'Forbidden rewrite' }).eq('id', eventId).select('id')
    expect(changed.error).toBeNull()
    expect(changed.data).toEqual([])
    const removed = await owner.client.from('audit_events').delete().eq('id', eventId).select('id')
    expect(removed.error).toBeNull()
    expect(removed.data).toEqual([])
    const stillPresent = await owner.client.from('audit_events').select('summary').eq('id', eventId).single()
    expect(stillPresent.error).toBeNull()
    expect(stillPresent.data?.summary).toBe(summary)
  })
})
