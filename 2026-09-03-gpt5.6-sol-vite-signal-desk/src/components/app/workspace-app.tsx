import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BellIcon, ChevronsUpDownIcon, LogOutIcon, PlusIcon, RadioTowerIcon, SearchIcon } from 'lucide-react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CommandMenu } from '@/components/app/command-menu'
import { Dashboard } from '@/components/app/dashboard'
import { ModulePage } from '@/components/app/module-page'
import { PipelineBoard } from '@/components/app/pipeline-board'
import { SettingsPage, type SettingsWorkspace } from '@/components/app/settings-page'
import { allNavigation, modules } from '@/components/app/module-definitions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import type { WorkspaceRole } from '@/lib/domain'
import { canViewAudit } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/use-profile'

type Workspace = SettingsWorkspace

export function WorkspaceApp({ session }: { session: Session }) {
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [workspaceId, setWorkspaceId] = useState(() => localStorage.getItem('signal-desk-workspace') ?? '')
  const [commandOpen, setCommandOpen] = useState(false)
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false)
  const profile = useProfile(session.user.id)

  const workspaceQuery = useQuery({
    queryKey: ['workspaces', session.user.id],
    queryFn: async (): Promise<Workspace[]> => {
      await supabase.from('profiles').upsert({
        id: session.user.id,
        full_name: String(session.user.user_metadata.full_name ?? session.user.email?.split('@')[0] ?? 'Signal Desk user'),
        email: session.user.email ?? '',
      })
      const { data: memberships, error } = await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', session.user.id)
        .order('created_at')
      if (error) throw error
      if (!memberships?.length) return []
      const { data: workspaceRows, error: workspaceError } = await supabase.from('workspaces').select('id,name,slug,owner_id,timezone,currency,plan').in('id', memberships.map((item) => item.workspace_id))
      if (workspaceError) throw workspaceError
      const roles = new Map(memberships.map((item) => [item.workspace_id, item.role]))
      return (workspaceRows ?? []).map((workspace) => ({ ...workspace, role: String(roles.get(workspace.id) ?? 'member') }))
    },
  })

  const workspaces = workspaceQuery.data ?? []
  const activeWorkspace = workspaces.find((workspace) => workspace.id === workspaceId) ?? workspaces[0]
  const visibleNavigation = allNavigation.filter((item) => item.key !== 'audit' || (activeWorkspace && canViewAudit(activeWorkspace.role as WorkspaceRole)))
  const visibleModules = modules.filter((module) => module.key !== 'audit' || (activeWorkspace && canViewAudit(activeWorkspace.role as WorkspaceRole)))

  useEffect(() => {
    if (!activeWorkspace) return
    localStorage.setItem('signal-desk-workspace', activeWorkspace.id)
  }, [activeWorkspace])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const currentKey = location.pathname.split('/').filter(Boolean)[0] ?? 'dashboard'
  const currentLabel = visibleNavigation.find((item) => item.key === currentKey)?.label ?? 'Overview'

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) toast.error(error.message)
  }

  if (workspaceQuery.isLoading) {
    return <div className="flex min-h-svh gap-4 p-4"><Skeleton className="w-60" /><Skeleton className="flex-1" /></div>
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground"><RadioTowerIcon aria-hidden="true" /></span>
                <span className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-semibold">{activeWorkspace?.name ?? 'Signal Desk'}</span><span className="truncate font-mono text-[10px] uppercase text-sidebar-foreground/60">{activeWorkspace?.role ?? 'No workspace'}</span></span>
                <ChevronsUpDownIcon aria-hidden="true" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuGroup>
                {workspaces.map((workspace) => <DropdownMenuItem key={workspace.id} onSelect={() => setWorkspaceId(workspace.id)}><span className="grid size-6 place-items-center rounded bg-primary/10 text-xs font-semibold text-primary">{workspace.name.slice(0, 1)}</span><span className="flex-1 truncate">{workspace.name}</span><Badge variant="outline">{workspace.role}</Badge></DropdownMenuItem>)}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup><DropdownMenuItem onSelect={() => setWorkspaceDialogOpen(true)}><PlusIcon aria-hidden="true" /> New workspace</DropdownMenuItem></DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Sales desk</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleNavigation.slice(0, 7).map((item) => <NavItem key={item.key} item={item} active={currentKey === item.key} />)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Operations</SidebarGroupLabel>
            <SidebarGroupContent><SidebarMenu>{visibleNavigation.slice(7).map((item) => <NavItem key={item.key} item={item} active={currentKey === item.key} />)}</SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu><SidebarMenuItem><SidebarMenuButton onClick={signOut} tooltip="Sign out"><Avatar className="size-7"><AvatarImage src={profile.data?.avatarSrc ?? undefined} alt={`${profile.data?.full_name ?? session.user.email ?? 'User'} profile photo`} /><AvatarFallback>{(profile.data?.full_name ?? session.user.email ?? 'SD').slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><span className="truncate">{session.user.email}</span><LogOutIcon aria-hidden="true" /></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <SidebarTrigger />
          <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbPage>{currentLabel}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden min-w-56 justify-start text-muted-foreground sm:flex" onClick={() => setCommandOpen(true)}><SearchIcon data-icon="inline-start" />Search or jump to…<kbd className="ml-auto font-mono text-[10px]">⌘K</kbd></Button>
            <Button variant="ghost" size="icon" aria-label="Notifications"><BellIcon aria-hidden="true" /></Button>
          </div>
        </header>

        {activeWorkspace ? (
          <Routes>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard workspace={activeWorkspace} />} />
            <Route path="pipeline" element={<PipelineBoard workspace={activeWorkspace} session={session} />} />
            <Route path="settings" element={<SettingsPage workspace={activeWorkspace} session={session} />} />
            {visibleModules.map((module) => <Route key={module.key} path={module.key} element={<ModulePage definition={module} workspace={activeWorkspace} session={session} />} />)}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        ) : <div className="grid flex-1 place-items-center p-6"><p className="text-muted-foreground">Create a workspace to start.</p></div>}
      </SidebarInset>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} onNavigate={(path) => navigate(`/${path}`)} items={visibleNavigation} />
      <WorkspaceDialog open={workspaceDialogOpen || (!workspaceQuery.isLoading && workspaces.length === 0)} onOpenChange={setWorkspaceDialogOpen} session={session} onCreated={async (id) => { await queryClient.invalidateQueries({ queryKey: ['workspaces'] }); setWorkspaceId(id) }} />
    </SidebarProvider>
  )
}

function NavItem({ item, active }: { item: (typeof allNavigation)[number]; active: boolean }) {
  const Icon = item.icon
  return <SidebarMenuItem><SidebarMenuButton asChild isActive={active} tooltip={item.label}><Link to={`/${item.key}`}><Icon aria-hidden="true" /><span>{item.label}</span></Link></SidebarMenuButton></SidebarMenuItem>
}

function WorkspaceDialog({ open, onOpenChange, session, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; session: Session; onCreated: (id: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const slug = useMemo(() => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), [name])

  async function createWorkspace(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.from('workspaces').insert({ name, slug: `${slug}-${crypto.randomUUID().slice(0, 6)}`, owner_id: session.user.id, created_by: session.user.id }).select('id').single()
    if (error || !data) { toast.error(error?.message ?? 'The workspace was not created.'); setLoading(false); return }
    const { error: memberError } = await supabase.from('workspace_members').insert({ workspace_id: data.id, workspace_owner_id: session.user.id, user_id: session.user.id, role: 'owner', created_by: session.user.id })
    if (memberError) {
      await supabase.from('workspaces').delete().eq('id', data.id)
      toast.error(memberError.message)
      setLoading(false)
      return
    }
    await onCreated(data.id)
    setName('')
    setLoading(false)
    onOpenChange(false)
    toast.success('Workspace created')
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Create a workspace</DialogTitle><DialogDescription>Each workspace keeps its customers, members, and pipeline separate.</DialogDescription></DialogHeader><form onSubmit={createWorkspace}><FieldGroup><Field><FieldLabel htmlFor="workspace-name">Workspace name</FieldLabel><Input id="workspace-name" value={name} onChange={(event) => setName(event.target.value)} required /></Field><Button type="submit" disabled={loading || name.trim().length < 2}>Create workspace</Button></FieldGroup></form></DialogContent></Dialog>
}
