import { useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2Icon, CameraIcon, UserRoundIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CRM_FILES_BUCKET } from '@/features/files/api'
import { avatarCacheKey, useProfile, type ProfileView } from '@/hooks/use-profile'
import { supabase } from '@/lib/supabase'

export type SettingsWorkspace = { id: string; name: string; slug: string; role: string; owner_id: string; timezone: string; currency: string; plan: string }
const avatarTypes = new Set(['image/png', 'image/jpeg'])

export function SettingsPage({ workspace, session }: { workspace: SettingsWorkspace; session: Session }) {
  const profile = useProfile(session.user.id)
  const organization = useQuery({ queryKey: ['organization', workspace.id], queryFn: async () => { const { data, error } = await supabase.from('workspaces').select('id,name,timezone,currency,plan,owner_id').eq('id', workspace.id).single(); if (error) throw error; return data } })
  if (profile.isLoading || organization.isLoading) return <main className="flex flex-1 flex-col gap-4 p-6"><Skeleton className="h-16 w-72" /><Skeleton className="h-96 max-w-3xl" /></main>
  if (profile.error || organization.error || !profile.data || !organization.data) return <main className="p-6"><Alert variant="destructive"><AlertTitle>Settings unavailable</AlertTitle><AlertDescription>{profile.error?.message ?? organization.error?.message}</AlertDescription></Alert></main>

  return <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6"><header><p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{workspace.name} / Control room</p><h1 className="text-2xl font-semibold tracking-tight">Settings</h1><p className="mt-1 text-sm text-muted-foreground">Your identity and the operating defaults for this sales desk.</p></header><Tabs defaultValue="profile" className="max-w-3xl"><TabsList><TabsTrigger value="profile"><UserRoundIcon aria-hidden="true" />Profile</TabsTrigger><TabsTrigger value="organization"><Building2Icon aria-hidden="true" />Organization</TabsTrigger></TabsList><TabsContent value="profile" className="pt-4"><ProfileForm key={`${profile.data.full_name}:${profile.data.avatar_url ?? ''}`} profile={profile.data} workspace={workspace} session={session} /></TabsContent><TabsContent value="organization" className="pt-4"><OrganizationForm key={`${organization.data.name}:${organization.data.timezone}:${organization.data.currency}`} organization={organization.data} workspace={workspace} session={session} /></TabsContent></Tabs></main>
}

function ProfileForm({ profile, workspace, session }: { profile: ProfileView & { updated_at?: string }; workspace: SettingsWorkspace; session: Session }) {
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState(profile.full_name)
  const [jobTitle, setJobTitle] = useState(profile.job_title ?? '')
  const [avatar, setAvatar] = useState<File | null>(null)
  const mutation = useMutation({
    mutationFn: async () => {
      let avatarPath = profile.avatar_url
      if (avatar) {
        if (!avatarTypes.has(avatar.type)) throw new Error('Choose a PNG or JPEG image.')
        if (avatar.size > 2 * 1024 * 1024) throw new Error('Profile photos must be 2 MB or smaller.')
        avatarPath = `${workspace.id}/${session.user.id}/profile/avatar`
        const uploaded = await supabase.storage.from(CRM_FILES_BUCKET).upload(avatarPath, await avatar.arrayBuffer(), { contentType: avatar.type, cacheControl: '3600', upsert: true })
        if (uploaded.error) throw uploaded.error
        localStorage.setItem(avatarCacheKey(avatarPath), await fileToDataUrl(avatar))
      }
      const { error } = await supabase.from('profiles').update({ full_name: fullName.trim(), job_title: jobTitle.trim() || null, avatar_url: avatarPath, updated_at: new Date().toISOString() }).eq('id', session.user.id)
      if (error) throw error
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] }); setAvatar(null); toast.success('Profile saved') },
    onError: (error) => toast.error(error.message),
  })
  function submit(event: FormEvent) { event.preventDefault(); if (fullName.trim()) mutation.mutate() }

  return <Card><form onSubmit={submit}><CardHeader><div className="flex items-center gap-4"><Avatar className="size-16"><AvatarImage src={profile.avatarSrc ?? undefined} alt={`${fullName} profile photo`} /><AvatarFallback>{initials(fullName)}</AvatarFallback></Avatar><div><CardTitle>Personal profile</CardTitle><CardDescription>This photo and name follow you across workspaces.</CardDescription></div></div></CardHeader><CardContent><FieldGroup><Field><FieldLabel htmlFor="display-name">Display name</FieldLabel><Input id="display-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></Field><Field><FieldLabel htmlFor="job-title">Job title</FieldLabel><Input id="job-title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="Revenue operations lead" /></Field><Field><FieldLabel htmlFor="profile-photo">Profile photo</FieldLabel><Input id="profile-photo" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} /><FieldDescription>PNG or JPEG, up to 2 MB. The image stays in private Storage.</FieldDescription></Field></FieldGroup></CardContent><CardFooter><Button type="submit" disabled={mutation.isPending || !fullName.trim()}>{mutation.isPending ? <Spinner data-icon="inline-start" /> : <CameraIcon data-icon="inline-start" />}Save profile</Button></CardFooter></form></Card>
}

function OrganizationForm({ organization, workspace, session }: { organization: { id: string; name: string; timezone: string; currency: string; plan: string; owner_id: string }; workspace: SettingsWorkspace; session: Session }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(organization.name)
  const [timezone, setTimezone] = useState(organization.timezone)
  const [currency, setCurrency] = useState(organization.currency)
  const canEdit = organization.owner_id === session.user.id
  const mutation = useMutation({
    mutationFn: async () => {
      const before = { name: organization.name, timezone: organization.timezone, currency: organization.currency }
      const { error } = await supabase.from('workspaces').update({ name: name.trim(), timezone, currency, updated_at: new Date().toISOString() }).eq('id', workspace.id)
      if (error) throw error
      const audit = await supabase.from('audit_events').insert({ workspace_id: workspace.id, actor_id: session.user.id, created_by: session.user.id, created_by_status: 'active', action: 'organization_updated', entity_type: 'workspace', entity_id: workspace.id, summary: `Updated settings for ${name.trim()}`, before_data: before, after_data: { name: name.trim(), timezone, currency } })
      if (audit.error) {
        const rollback = await supabase.from('workspaces').update({ ...before, updated_at: new Date().toISOString() }).eq('id', workspace.id)
        if (rollback.error) throw new Error(`The audit event failed (${audit.error.message}) and the organization rollback also failed (${rollback.error.message}). Reload settings before trying again.`)
        throw new Error(`The audit event failed, so the organization change was rolled back: ${audit.error.message}`)
      }
    },
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['organization', workspace.id] }), queryClient.invalidateQueries({ queryKey: ['workspaces'] })]); toast.success('Organization saved') },
    onError: (error) => toast.error(error.message),
  })
  function submit(event: FormEvent) { event.preventDefault(); if (canEdit && name.trim()) mutation.mutate() }

  return <Card><form onSubmit={submit}><CardHeader><CardTitle>Organization defaults</CardTitle><CardDescription>These values drive workspace labels, dates, and money.</CardDescription></CardHeader><CardContent>{!canEdit && <Alert><AlertTitle>Owner access required</AlertTitle><AlertDescription>You can view these defaults. Only the workspace owner can change them in the local runtime.</AlertDescription></Alert>}<FieldGroup className="mt-4"><Field data-disabled={!canEdit}><FieldLabel htmlFor="organization-name">Organization name</FieldLabel><Input id="organization-name" value={name} onChange={(event) => setName(event.target.value)} disabled={!canEdit} required /></Field><Field data-disabled={!canEdit}><FieldLabel>Timezone</FieldLabel><Select value={timezone} onValueChange={setTimezone} disabled={!canEdit}><SelectTrigger aria-label="Timezone"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{['America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Zurich', 'Asia/Singapore', 'Australia/Sydney', 'UTC'].map((value) => <SelectItem key={value} value={value}>{value.replaceAll('_', ' ')}</SelectItem>)}</SelectGroup></SelectContent></Select></Field><Field data-disabled={!canEdit}><FieldLabel>Currency</FieldLabel><Select value={currency} onValueChange={setCurrency} disabled={!canEdit}><SelectTrigger aria-label="Currency"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{['USD', 'EUR', 'GBP', 'CHF', 'SGD', 'AUD'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectGroup></SelectContent></Select></Field><Field data-disabled><FieldLabel htmlFor="plan">Plan</FieldLabel><Input id="plan" value={organization.plan} disabled /></Field></FieldGroup></CardContent>{canEdit && <CardFooter><Button type="submit" disabled={mutation.isPending || !name.trim()}>{mutation.isPending && <Spinner data-icon="inline-start" />}Save organization</Button></CardFooter>}</form></Card>
}

function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SD' }
function fileToDataUrl(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error ?? new Error('Profile photo could not be read')); reader.readAsDataURL(file) }) }
