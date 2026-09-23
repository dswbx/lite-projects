import { useQuery } from '@tanstack/react-query'
import type { ModuleField, RelationTable } from '@/components/app/module-definitions'
import { supabase } from '@/lib/supabase'

export type RelationshipOption = { value: string; label: string }
export type RelationshipOptions = Record<string, RelationshipOption[]>

export function useRelationshipOptions(workspaceId: string, fields: readonly ModuleField[]) {
  const relations = fields.filter((field) => field.type === 'relation' && field.relation)
  return useQuery({
    queryKey: ['relationship-options', workspaceId, relations.map((field) => `${field.key}:${field.relation?.table}`).join('|')],
    enabled: relations.length > 0,
    queryFn: async (): Promise<RelationshipOptions> => {
      const entries = await Promise.all(relations.map(async (field) => {
        const relation = field.relation!
        const columns = ['id', ...relation.labelFields].join(',')
        let request = supabase.from(relation.table as RelationTable).select(columns).limit(250)
        if (relation.workspaceScoped !== false) request = request.eq('workspace_id', workspaceId)
        const { data, error } = await request
        if (error) throw error
        const options = ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
          value: String(row.id),
          label: relation.labelFields.map((key) => String(row[key] ?? '')).filter(Boolean).join(' · '),
        })).sort((left, right) => left.label.localeCompare(right.label))
        return [field.key, options] as const
      }))
      return Object.fromEntries(entries)
    },
  })
}
