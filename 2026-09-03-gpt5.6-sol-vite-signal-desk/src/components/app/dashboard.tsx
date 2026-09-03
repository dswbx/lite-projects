import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow, isBefore } from 'date-fns'
import { ArrowUpRightIcon, Building2Icon, CircleDollarSignIcon, ContactRoundIcon, ListTodoIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { DealSignalRail } from '@/components/app/deal-signal-rail'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { crmRepository } from '@/lib/repositories'
import { supabase } from '@/lib/supabase'

type WorkspaceSummary = { id: string; name: string; slug: string; role: string; timezone: string; currency: string }

const chartConfig = { value: { label: 'Weighted value', color: 'var(--chart-1)' } } satisfies ChartConfig

export function Dashboard({ workspace }: { workspace: WorkspaceSummary }) {
  const query = useQuery({
    queryKey: ['dashboard', workspace.id],
    queryFn: async () => {
      const [accounts, contacts, opportunities, stages, tasks, summary, signals] = await Promise.all([
        supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
        supabase.from('opportunities').select('id,value,probability,stage_id', { count: 'exact' }).eq('workspace_id', workspace.id).eq('status', 'open'),
        supabase.from('pipeline_stages').select('id,name').eq('workspace_id', workspace.id),
        supabase.from('tasks').select('id,title,due_at,priority,status', { count: 'exact' }).eq('workspace_id', workspace.id).in('status', ['open', 'in_progress']).order('due_at').limit(6),
        crmRepository.dashboardSummary(workspace.id),
        crmRepository.dealSignals(workspace.id),
      ])
      for (const result of [accounts, contacts, opportunities, stages, tasks]) if (result.error) throw result.error
      if (!summary.ok) throw new Error(summary.error.message)
      if (!signals.ok) throw new Error(signals.error.message)

      const byStage = new Map<string, number>()
      const stageNames = new Map((stages.data ?? []).map((stage) => [stage.id, stage.name]))
      for (const deal of opportunities.data ?? []) {
        const label = stageNames.get(deal.stage_id) ?? 'Unassigned'
        byStage.set(label, (byStage.get(label) ?? 0) + Number(deal.value ?? 0) * Number(deal.probability ?? 0) / 100)
      }
      return {
        counts: {
          accounts: accounts.count ?? 0,
          contacts: contacts.count ?? 0,
          opportunities: opportunities.count ?? opportunities.data?.length ?? 0,
          tasks: tasks.count ?? tasks.data?.length ?? 0,
        },
        summary: summary.data,
        signals: signals.data,
        tasks: tasks.data ?? [],
        chart: Array.from(byStage, ([stage, value]) => ({ stage, value: Math.round(value) })),
      }
    },
  })

  if (query.isLoading) return <DashboardSkeleton />
  if (query.error || !query.data) return <div className="p-6 text-sm text-destructive">Dashboard data failed to load: {query.error?.message}</div>

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{workspace.name} / Today</p><h1 className="text-2xl font-semibold tracking-tight">Revenue signal</h1><p className="mt-1 text-sm text-muted-foreground">Pipeline movement and follow-up pressure in one view.</p></div>
        <Button variant="outline" asChild><a href="/pipeline">Open pipeline <ArrowUpRightIcon data-icon="inline-end" /></a></Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Building2Icon} label="Accounts" value={query.data.counts.accounts.toLocaleString()} note="Tracked companies" />
        <MetricCard icon={ContactRoundIcon} label="Contacts" value={query.data.counts.contacts.toLocaleString()} note="Known stakeholders" />
        <MetricCard icon={CircleDollarSignIcon} label="Open pipeline" value={formatMoney(query.data.summary.openPipelineValue, workspace.currency)} note={`${query.data.counts.opportunities} active deals · ${formatMoney(query.data.summary.weightedPipelineValue, workspace.currency)} weighted`} />
        <MetricCard icon={ListTodoIcon} label="Open tasks" value={query.data.counts.tasks.toLocaleString()} note={`${query.data.summary.overdueTasks} overdue`} />
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-w-0">
          <CardHeader><CardTitle>Weighted pipeline</CardTitle><CardDescription>Expected value grouped by current stage.</CardDescription></CardHeader>
          <CardContent>
            {query.data.chart.length ? <ChartContainer config={chartConfig} className="h-72 w-full"><BarChart accessibilityLayer data={query.data.chart}><CartesianGrid vertical={false} /><XAxis dataKey="stage" tickLine={false} axisLine={false} tickMargin={10} /><ChartTooltip content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value), workspace.currency)} />} /><Bar dataKey="value" fill="var(--color-value)" radius={[5, 5, 0, 0]} /></BarChart></ChartContainer> : <p className="grid h-72 place-items-center text-sm text-muted-foreground">Add an opportunity to see stage value.</p>}
          </CardContent>
        </Card>
        <DealSignalRail deals={query.data.signals.slice(0, 7)} currency={workspace.currency} />
      </section>

      <Card>
        <CardHeader><CardTitle>Follow-up queue</CardTitle><CardDescription>The next open tasks ordered by due date.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {query.data.tasks.length === 0 ? <p className="text-sm text-muted-foreground">No open tasks.</p> : query.data.tasks.map((task) => {
            const overdue = task.due_at ? isBefore(new Date(String(task.due_at)), new Date()) : false
            return <div key={String(task.id)} className="grid gap-2 border-b pb-3 last:border-0 last:pb-0 sm:grid-cols-[1fr_auto_auto] sm:items-center"><span className="font-medium">{String(task.title)}</span><Badge variant={overdue ? 'destructive' : 'secondary'}>{String(task.priority)}</Badge><span className="font-mono text-xs text-muted-foreground">{task.due_at ? formatDistanceToNow(new Date(String(task.due_at)), { addSuffix: true }) : 'No due date'}</span></div>
          })}
        </CardContent>
      </Card>
    </main>
  )
}

function MetricCard({ icon: Icon, label, value, note }: { icon: typeof Building2Icon; label: string; value: string; note: string }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardDescription>{label}</CardDescription><Icon className="text-muted-foreground" aria-hidden="true" /></CardHeader><CardContent><div className="font-mono text-2xl font-semibold tracking-tight">{value}</div><p className="mt-1 text-xs text-muted-foreground">{note}</p></CardContent></Card>
}

function DashboardSkeleton() {
  return <div className="flex flex-col gap-5 p-6"><Skeleton className="h-16 w-80" /><div className="grid gap-3 md:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32" />)}</div><div className="grid gap-4 xl:grid-cols-[1fr_380px]"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>
}

function formatMoney(value: number, currency: string) { return new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: value > 999_999 ? 'compact' : 'standard', maximumFractionDigits: 0 }).format(value) }
