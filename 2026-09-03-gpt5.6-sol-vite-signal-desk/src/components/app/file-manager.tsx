import { useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DownloadIcon, EyeIcon, FileIcon, FileUpIcon, MoreHorizontalIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { ModuleField, RelationTable } from '@/components/app/module-definitions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fileRepository } from '@/features/files/api'
import { useRelationshipOptions } from '@/hooks/use-relationship-options'
import type { EntityType } from '@/lib/domain'
import { supabase } from '@/lib/supabase'

type WorkspaceSummary = { id: string; name: string; slug: string; role: string }
type FileRecord = { id: string; file_name: string; mime_type: string; size_bytes: number; storage_path: string; created_at: string }
const maxSize = 10 * 1024 * 1024
const allowedTypes = new Set(['application/pdf', 'image/png', 'image/jpeg', 'text/csv', 'text/plain'])
const entityRelations: Record<string, { table: RelationTable; labelFields: string[] }> = {
  account: { table: 'accounts', labelFields: ['name'] },
  contact: { table: 'contacts', labelFields: ['first_name', 'last_name'] },
  lead: { table: 'leads', labelFields: ['first_name', 'last_name', 'company'] },
  opportunity: { table: 'opportunities', labelFields: ['name'] },
  task: { table: 'tasks', labelFields: ['title'] },
  quote: { table: 'quotes', labelFields: ['quote_number'] },
  campaign: { table: 'campaigns', labelFields: ['name'] },
}

export function FileManager({ workspace, session }: { workspace: WorkspaceSummary; session: Session }) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [deleteTarget, setDeleteTarget] = useState<FileRecord | null>(null)
  const [preview, setPreview] = useState<FileRecord | null>(null)
  const [entityType, setEntityType] = useState<EntityType>('account')
  const [entityId, setEntityId] = useState('')
  const targetFields = useMemo<ModuleField[]>(() => [{ key: 'entity_id', label: 'Linked record', type: 'relation', required: true, relation: entityRelations[entityType] }], [entityType])
  const relationshipQuery = useRelationshipOptions(workspace.id, targetFields)
  const targetOptions = relationshipQuery.data?.entity_id ?? []
  const query = useQuery({ queryKey: ['files', workspace.id], queryFn: async () => { const { data, error } = await supabase.from('file_assets').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false }); if (error) throw error; return (data ?? []) as FileRecord[] } })

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!allowedTypes.has(file.type)) throw new Error('Choose a PDF, PNG, JPEG, CSV, or text file.')
      if (file.size > maxSize) throw new Error('Choose a file smaller than 10 MB.')
      if (!entityId) throw new Error('Choose the record this file belongs to.')
      const result = await fileRepository.upload({ file, workspaceId: workspace.id, actorId: session.user.id, entityType, entityId })
      if (!result.ok) throw new Error(result.error.message)
      const audit = await supabase.from('audit_events').insert({ workspace_id: workspace.id, actor_id: session.user.id, created_by: session.user.id, created_by_status: 'active', action: 'uploaded', entity_type: 'file', entity_id: result.data.asset.id, summary: `Uploaded ${file.name}` })
      if (audit.error) throw audit.error
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['files', workspace.id] }); toast.success('File uploaded'); if (inputRef.current) inputRef.current.value = '' },
    onError: (error) => toast.error(error.message),
  })

  const remove = useMutation({
    mutationFn: async (file: FileRecord) => {
      const result = await fileRepository.remove(workspace.id, file.id)
      if (!result.ok) throw new Error(result.error.message)
      const audit = await supabase.from('audit_events').insert({ workspace_id: workspace.id, actor_id: session.user.id, created_by: session.user.id, created_by_status: 'active', action: 'deleted', entity_type: 'file', entity_id: file.id, summary: `Removed ${file.file_name}` })
      if (audit.error) throw audit.error
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['files', workspace.id] }); setDeleteTarget(null); toast.success('File removed') },
    onError: (error) => toast.error(error.message),
  })

  async function download(file: FileRecord) {
    const result = await fileRepository.download(workspace.id, file.id)
    if (!result.ok) return toast.error(result.error.message)
    const url = URL.createObjectURL(result.data.blob)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.file_name; anchor.click(); URL.revokeObjectURL(url)
  }

  return <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6"><header><p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{workspace.name}</p><h1 className="text-2xl font-semibold tracking-tight">Files</h1><p className="mt-1 text-sm text-muted-foreground">Private documents stored by workspace and linked to named CRM records.</p></header>
    <Card><CardHeader><CardTitle>Upload a file</CardTitle><CardDescription>Choose its CRM record, then upload a PDF, PNG, JPEG, CSV, or text file up to 10 MB.</CardDescription></CardHeader><CardContent><FieldGroup className="grid lg:grid-cols-[180px_minmax(260px,1fr)_auto]"><Field><FieldLabel>Record type</FieldLabel><Select value={entityType} onValueChange={(value) => { setEntityType(value as EntityType); setEntityId('') }}><SelectTrigger aria-label="Linked record type"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{Object.keys(entityRelations).map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectGroup></SelectContent></Select></Field><Field><FieldLabel>Linked record</FieldLabel><Select value={entityId} onValueChange={setEntityId} disabled={relationshipQuery.isLoading}><SelectTrigger aria-label="Linked record"><SelectValue placeholder={relationshipQuery.isLoading ? 'Loading records…' : 'Choose a record'} /></SelectTrigger><SelectContent><SelectGroup>{targetOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent></Select></Field><Field><FieldLabel className="sr-only" htmlFor="file-upload">File</FieldLabel><Input id="file-upload" ref={inputRef} className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg,.csv,.txt,application/pdf,image/png,image/jpeg,text/csv,text/plain" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file) }} disabled={upload.isPending || !entityId} /><Button type="button" onClick={() => inputRef.current?.click()} disabled={upload.isPending || !entityId}><FileUpIcon data-icon="inline-start" />Choose file</Button></Field>{upload.isPending && <Progress value={66} className="lg:col-span-3" aria-label="Uploading file" />}</FieldGroup></CardContent></Card>
    <Alert><FileIcon aria-hidden="true" /><AlertTitle>Storage is local and experimental</AlertTitle><AlertDescription>File bytes stay under `supabase/.temp/storage`. A future full Supabase upgrade must transfer these objects separately.</AlertDescription></Alert>
    <Card className="overflow-hidden"><CardHeader><CardTitle>Workspace files</CardTitle><CardDescription>Select a row to preview its stored bytes.</CardDescription></CardHeader><CardContent className="p-0">{query.isLoading ? <div className="flex flex-col gap-2 p-4">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-10" />)}</div> : query.error ? <p className="p-6 text-sm text-destructive">{query.error.message}</p> : query.data?.length === 0 ? <Empty className="min-h-64"><EmptyHeader><EmptyMedia variant="icon"><FileIcon /></EmptyMedia><EmptyTitle>No files yet</EmptyTitle><EmptyDescription>Upload a document to exercise the real Supabase Storage API.</EmptyDescription></EmptyHeader><EmptyContent><Button onClick={() => inputRef.current?.click()}><FileUpIcon data-icon="inline-start" />Choose file</Button></EmptyContent></Empty> : <Table><TableHeader><TableRow><TableHead>File</TableHead><TableHead>Type</TableHead><TableHead>Size</TableHead><TableHead>Uploaded</TableHead><TableHead className="w-12"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{query.data?.map((file) => <TableRow key={file.id} className="cursor-pointer focus-visible:outline-2 focus-visible:outline-ring" tabIndex={0} aria-label={`Preview ${file.file_name}`} onClick={() => setPreview(file)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPreview(file) } }}><TableCell className="font-medium">{file.file_name}</TableCell><TableCell>{file.mime_type}</TableCell><TableCell className="font-mono text-xs">{formatBytes(file.size_bytes)}</TableCell><TableCell className="font-mono text-xs">{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(file.created_at))}</TableCell><TableCell onClick={(event) => event.stopPropagation()}><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${file.file_name}`}><MoreHorizontalIcon /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuItem onSelect={() => setPreview(file)}><EyeIcon />Preview</DropdownMenuItem><DropdownMenuItem onSelect={() => download(file)}><DownloadIcon />Download</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(file)}><Trash2Icon />Remove</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>
    <FilePreviewDialog file={preview} workspaceId={workspace.id} onOpenChange={(open) => !open && setPreview(null)} onDownload={download} />
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove this file?</AlertDialogTitle><AlertDialogDescription>This removes both the stored object and its CRM metadata.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => deleteTarget && remove.mutate(deleteTarget)}>Remove file</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </main>
}

function FilePreviewDialog({ file, workspaceId, onOpenChange, onDownload }: { file: FileRecord | null; workspaceId: string; onOpenChange: (open: boolean) => void; onDownload: (file: FileRecord) => void }) {
  const query = useQuery({
    queryKey: ['file-preview', workspaceId, file?.id],
    enabled: Boolean(file),
    queryFn: async () => {
      const result = await fileRepository.download(workspaceId, file!.id)
      if (!result.ok) throw new Error(result.error.message)
      const text = file!.mime_type === 'text/plain' || file!.mime_type === 'text/csv' ? await result.data.blob.text() : null
      return { blob: result.data.blob, text }
    },
  })
  const objectUrl = useMemo(() => query.data?.blob && file && !file.mime_type.startsWith('text/') ? URL.createObjectURL(query.data.blob) : '', [file, query.data])
  useEffect(() => {
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [objectUrl])

  return <Dialog open={Boolean(file)} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>{file?.file_name ?? 'File preview'}</DialogTitle><DialogDescription>{file ? `${file.mime_type} · ${formatBytes(file.size_bytes)}` : 'Stored file'}</DialogDescription></DialogHeader><ScrollArea className="max-h-[65vh] min-h-64 rounded-lg border p-4">{query.isLoading ? <Skeleton className="h-64 w-full" /> : query.error ? <Alert variant="destructive"><AlertTitle>Preview unavailable</AlertTitle><AlertDescription>{query.error.message}</AlertDescription></Alert> : file?.mime_type.startsWith('image/') && objectUrl ? <img src={objectUrl} alt={`Preview of ${file.file_name}`} className="mx-auto max-h-[58vh] max-w-full object-contain" /> : file?.mime_type === 'application/pdf' && objectUrl ? <object data={objectUrl} type="application/pdf" className="h-[58vh] w-full"><p>Use Download to open this PDF.</p></object> : query.data?.text !== null ? <pre className="whitespace-pre-wrap font-mono text-xs">{query.data?.text}</pre> : <Empty><EmptyHeader><EmptyMedia variant="icon"><FileIcon /></EmptyMedia><EmptyTitle>No inline preview</EmptyTitle><EmptyDescription>Download this file to open it.</EmptyDescription></EmptyHeader></Empty>}</ScrollArea><DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose><Button onClick={() => file && onDownload(file)}><DownloadIcon data-icon="inline-start" />Download</Button></DialogFooter></DialogContent></Dialog>
}

function formatBytes(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1024 / 1024).toFixed(1)} MB` }
