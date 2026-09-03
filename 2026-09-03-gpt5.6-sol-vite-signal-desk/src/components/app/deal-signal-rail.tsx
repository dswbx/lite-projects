import { AlertTriangleIcon, RadioTowerIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { DealSignal } from '@/lib/domain'

export function DealSignalRail({ deals, currency }: { deals: DealSignal[]; currency: string }) {
  return <Card className="min-w-0 overflow-hidden border-sidebar/20"><CardHeader className="bg-sidebar text-sidebar-foreground"><div className="flex items-center gap-2"><RadioTowerIcon aria-hidden="true" /><CardTitle className="text-base">Deal signal rail</CardTitle></div><CardDescription className="text-sidebar-foreground/65">Stage age, activity, value, and risk.</CardDescription></CardHeader><CardContent className="p-0"><ScrollArea className="h-72 xl:h-[288px]" aria-label="Deal signals"><div className="flex flex-col">{deals.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No active opportunities.</p> : deals.map((deal) => <SignalRow key={deal.opportunityId} deal={deal} currency={currency} />)}</div></ScrollArea></CardContent></Card>
}

function SignalRow({ deal, currency }: { deal: DealSignal; currency: string }) {
  const health = deal.risk === 'high' ? 28 : deal.risk === 'medium' ? 62 : 88
  const activity = deal.daysSinceActivity === null ? 'No activity' : deal.daysSinceActivity === 0 ? 'Active today' : `${deal.daysSinceActivity}d since activity`
  return <div className="border-b p-4 last:border-0"><div className="mb-2 flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{deal.name}</p><p className="font-mono text-[11px] text-muted-foreground">{formatMoney(deal.value, currency)} · {deal.stageName}</p></div>{deal.risk === 'high' ? <Badge variant="destructive"><AlertTriangleIcon aria-hidden="true" />High risk</Badge> : <Badge variant="secondary">{deal.risk === 'medium' ? 'Watch' : 'On track'}</Badge>}</div><Progress value={health} aria-label={`${deal.name} health ${health} percent`} /><p className="mt-2 text-[11px] text-muted-foreground">{deal.stageAgeDays}d in stage · {activity}</p></div>
}

function formatMoney(value: number, currency: string) { return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value) }
