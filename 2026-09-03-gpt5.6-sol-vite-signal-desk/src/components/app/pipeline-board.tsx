import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { DndContext, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClockIcon, GripVerticalIcon, MoreHorizontalIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { ModuleDefinition } from '@/components/app/module-definitions'
import { RecordSheet } from '@/components/app/record-sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { crmRepository } from '@/lib/repositories'
import { supabase } from '@/lib/supabase'
import { useRelationshipOptions } from '@/hooks/use-relationship-options'

type WorkspaceSummary = { id: string; name: string; slug: string; role: string; currency: string; timezone: string }
type Stage = { id: string; name: string; position: number; probability: number; stage_type: 'open' | 'won' | 'lost' }
type Opportunity = { id: string; account_id: string | null; name: string; value: number; probability: number; stage_id: string; stage_entered_at: string; expected_close_date: string | null; status: 'open' | 'won' | 'lost'; updated_at: string }

const opportunityDefinition: ModuleDefinition = {
  key: 'opportunities', table: 'opportunities', label: 'Opportunities', singular: 'opportunity', description: 'Create a deal in the active pipeline.', icon: PlusIcon, ownerField: true,
  columns: [], fields: [
    { key: 'name', label: 'Opportunity name', type: 'text', required: true },
    { key: 'value', label: 'Deal value', type: 'number', required: true },
    { key: 'probability', label: 'Probability', type: 'number' },
    { key: 'expected_close_date', label: 'Expected close', type: 'date' },
    { key: 'account_id', label: 'Account', type: 'relation', relation: { table: 'accounts', labelFields: ['name'], optional: true } },
  ],
}

export function PipelineBoard({ workspace, session }: { workspace: WorkspaceSummary; session: Session }) {
  const queryClient = useQueryClient()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))
  const [editorOpen, setEditorOpen] = useState(false)
  const [selected, setSelected] = useState<Opportunity | null>(null)
  const relationshipQuery = useRelationshipOptions(workspace.id, opportunityDefinition.fields)

  const query = useQuery({
    queryKey: ['pipeline', workspace.id],
    queryFn: async () => {
      const { data: pipelines, error: pipelineError } = await supabase.from('pipelines').select('id,name').eq('workspace_id', workspace.id).order('created_at').limit(1)
      if (pipelineError) throw pipelineError
      const pipeline = pipelines?.[0]
      if (!pipeline) return { pipeline: null, stages: [] as Stage[], opportunities: [] as Opportunity[] }
      const [stageResult, opportunityResult] = await Promise.all([
        supabase.from('pipeline_stages').select('id,name,position,probability,stage_type').eq('pipeline_id', pipeline.id).order('position'),
        supabase.from('opportunities').select('id,account_id,name,value,probability,stage_id,stage_entered_at,expected_close_date,status,updated_at').eq('workspace_id', workspace.id).eq('pipeline_id', pipeline.id).order('value', { ascending: false }),
      ])
      if (stageResult.error) throw stageResult.error
      if (opportunityResult.error) throw opportunityResult.error
      return { pipeline, stages: (stageResult.data ?? []) as Stage[], opportunities: (opportunityResult.data ?? []) as Opportunity[] }
    },
  })

  const move = useMutation({
    mutationFn: async ({ opportunity, stage }: { opportunity: Opportunity; stage: Stage }) => {
      const changedAt = new Date().toISOString()
      const result = await crmRepository.update('opportunities', opportunity.id, { stage_id: stage.id, probability: stage.probability, stage_entered_at: changedAt, status: stage.stage_type }, { workspaceId: workspace.id, userId: session.user.id, ownerId: session.user.id, entityType: 'opportunity' })
      if (!result.ok) throw new Error(result.error.message)
      const activity = await supabase.from('activities').insert({ workspace_id: workspace.id, owner_id: session.user.id, created_by: session.user.id, created_by_status: 'active', type: 'stage_change', subject: `${opportunity.name} moved to ${stage.name}`, description: `Probability changed to ${stage.probability}%.`, occurred_at: new Date().toISOString(), opportunity_id: opportunity.id })
      if (activity.error) {
        await crmRepository.update('opportunities', opportunity.id, { stage_id: opportunity.stage_id, probability: opportunity.probability, stage_entered_at: opportunity.stage_entered_at, status: opportunity.status }, { workspaceId: workspace.id, userId: session.user.id, ownerId: session.user.id, entityType: 'opportunity' })
        throw activity.error
      }
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['pipeline', workspace.id] }); await queryClient.invalidateQueries({ queryKey: ['dashboard', workspace.id] }); toast.success('Opportunity moved') },
    onError: (error) => toast.error(error.message),
  })

  async function saveOpportunity(values: Record<string, unknown>) {
    const firstStage = query.data?.stages[0]
    const pipeline = query.data?.pipeline
    if (!firstStage || !pipeline) throw new Error('Create a pipeline stage before adding opportunities.')
    const context = { workspaceId: workspace.id, userId: session.user.id, ownerId: session.user.id, entityType: 'opportunity' as const }
    const result = selected
      ? await crmRepository.update('opportunities', selected.id, values, context)
      : await crmRepository.create('opportunities', { ...values, pipeline_id: pipeline.id, stage_id: firstStage.id, probability: Number(values.probability || firstStage.probability) }, context)
    if (!result.ok) throw new Error(result.error.message)
    await queryClient.invalidateQueries({ queryKey: ['pipeline', workspace.id] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard', workspace.id] })
    setEditorOpen(false)
    setSelected(null)
    toast.success(selected ? 'Opportunity saved' : 'Opportunity created')
  }

  function onDragEnd(event: DragEndEvent) {
    const opportunity = query.data?.opportunities.find((item) => item.id === event.active.id)
    const stage = query.data?.stages.find((item) => item.id === event.over?.id)
    if (opportunity && stage && opportunity.stage_id !== stage.id) move.mutate({ opportunity, stage })
  }

  if (query.isLoading) return <div className="flex gap-4 overflow-hidden p-6">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-[70vh] min-w-72" />)}</div>

  return <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6"><header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{workspace.name} / {query.data?.pipeline?.name ?? 'Pipeline'}</p><h1 className="text-2xl font-semibold tracking-tight">Opportunity pipeline</h1><p className="mt-1 text-sm text-muted-foreground">Open a card for details. Drag cards between stages or use each card’s stage menu.</p></div><Button onClick={() => { setSelected(null); setEditorOpen(true) }} disabled={!query.data?.stages.length}><PlusIcon data-icon="inline-start" />Create opportunity</Button></header>
    {query.error ? <p className="text-sm text-destructive">{query.error.message}</p> : !query.data?.pipeline ? <Card><CardHeader><CardTitle>No pipeline</CardTitle><CardDescription>Add a pipeline and stages before creating opportunities.</CardDescription></CardHeader></Card> : <DndContext sensors={sensors} onDragEnd={onDragEnd}><ScrollArea className="min-h-0 flex-1 whitespace-nowrap"><div className="flex min-w-max gap-3 pb-4">{query.data.stages.map((stage) => <StageColumn key={stage.id} stage={stage} opportunities={query.data.opportunities.filter((item) => item.stage_id === stage.id)} stages={query.data.stages} currency={workspace.currency} onMove={(opportunity, nextStage) => move.mutate({ opportunity, stage: nextStage })} onOpen={(opportunity) => { setSelected(opportunity); setEditorOpen(true) }} />)}</div><ScrollBar orientation="horizontal" /></ScrollArea></DndContext>}
    <RecordSheet definition={opportunityDefinition} record={selected as unknown as Record<string, unknown> | null} open={editorOpen} onOpenChange={(open) => { setEditorOpen(open); if (!open) setSelected(null) }} onSave={saveOpportunity} loading={false} options={relationshipQuery.data} />
  </main>
}

function StageColumn({ stage, opportunities, stages, currency, onMove, onOpen }: { stage: Stage; opportunities: Opportunity[]; stages: Stage[]; currency: string; onMove: (opportunity: Opportunity, stage: Stage) => void; onOpen: (opportunity: Opportunity) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const total = opportunities.reduce((sum, item) => sum + Number(item.value), 0)
  return <section ref={setNodeRef} className={`w-72 shrink-0 rounded-lg border bg-muted/45 p-2 transition-colors ${isOver ? 'border-primary bg-primary/5' : ''}`} aria-label={`${stage.name} stage`}><header className="mb-2 flex items-center gap-2 px-1 py-2"><span className="size-2 rounded-full" style={{ backgroundColor: stageColor(stage.position) }} /><h2 className="text-sm font-semibold">{stage.name}</h2><Badge variant="outline" className="ml-auto">{opportunities.length}</Badge></header><p className="mb-3 px-1 font-mono text-xs text-muted-foreground">{formatMoney(total, currency)} · {stage.probability}%</p><div className="flex min-h-32 flex-col gap-2">{opportunities.map((opportunity) => <DealCard key={opportunity.id} opportunity={opportunity} stages={stages} currency={currency} onMove={onMove} onOpen={onOpen} />)}</div></section>
}

function DealCard({ opportunity, stages, currency, onMove, onOpen }: { opportunity: Opportunity; stages: Stage[]; currency: string; onMove: (opportunity: Opportunity, stage: Stage) => void; onOpen: (opportunity: Opportunity) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: opportunity.id, data: opportunity })
  return <Card ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }} className={`whitespace-normal shadow-sm ${isDragging ? 'z-30 opacity-75' : ''}`}><CardHeader className="p-3 pb-1"><div className="flex items-start gap-2"><button type="button" className="mt-0.5 rounded p-1 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring" aria-label={`Move ${opportunity.name}`} {...listeners} {...attributes}><GripVerticalIcon aria-hidden="true" /></button><button type="button" className="min-w-0 flex-1 text-left" aria-label={`Open ${opportunity.name}`} onClick={() => onOpen(opportunity)}><CardTitle className="truncate text-sm">{opportunity.name}</CardTitle><CardDescription className="font-mono text-xs">{formatMoney(opportunity.value, currency)} · {opportunity.probability}%</CardDescription></button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Choose stage for ${opportunity.name}`}><MoreHorizontalIcon /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Move to stage</DropdownMenuLabel><DropdownMenuGroup>{stages.map((stage) => <DropdownMenuItem key={stage.id} disabled={stage.id === opportunity.stage_id} onSelect={() => onMove(opportunity, stage)}>{stage.name}</DropdownMenuItem>)}</DropdownMenuGroup></DropdownMenuContent></DropdownMenu></div></CardHeader><CardContent><button type="button" className="flex w-full items-center gap-2 text-left text-xs text-muted-foreground" onClick={() => onOpen(opportunity)}><CalendarClockIcon aria-hidden="true" />{opportunity.expected_close_date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${opportunity.expected_close_date}T00:00:00Z`)) : 'No close date'}</button></CardContent></Card>
}

function formatMoney(value: number, currency: string) { return new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(value) }
function stageColor(position: number) { return ['#2864dc', '#e3a11a', '#ef755d', '#61758a', '#149477'][position % 5] }
