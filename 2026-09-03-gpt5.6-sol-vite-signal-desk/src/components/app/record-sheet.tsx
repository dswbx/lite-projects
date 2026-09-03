import { useState, type FormEvent, type RefObject } from 'react'
import type { ModuleDefinition, ModuleField } from '@/components/app/module-definitions'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { RelationshipOptions } from '@/hooks/use-relationship-options'

export function RecordSheet({ definition, record, open, onOpenChange, onSave, loading, returnFocusRef, options = {}, readOnly = false }: {
  definition: ModuleDefinition
  record: Record<string, unknown> | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (values: Record<string, unknown>) => Promise<void>
  loading: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
  options?: RelationshipOptions
  readOnly?: boolean
}) {
  return <RecordSheetForm key={`${definition.key}:${String(record?.id ?? 'new')}:${open ? 'open' : 'closed'}`} definition={definition} record={record} open={open} onOpenChange={onOpenChange} onSave={onSave} loading={loading} returnFocusRef={returnFocusRef} options={options} readOnly={readOnly} />
}

function RecordSheetForm({ definition, record, open, onOpenChange, onSave, loading, returnFocusRef, options, readOnly }: {
  definition: ModuleDefinition
  record: Record<string, unknown> | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (values: Record<string, unknown>) => Promise<void>
  loading: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
  options: RelationshipOptions
  readOnly: boolean
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => Object.fromEntries(definition.fields.map((field) => [field.key, displayValue(record?.[field.key] ?? defaultValue(field))])))
  const [submitted, setSubmitted] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (definition.fields.some((field) => field.required && !String(values[field.key] ?? '').trim())) return
    const normalized = Object.fromEntries(definition.fields.map((field) => [
      field.key,
      !field.required && values[field.key] === '' ? null : values[field.key],
    ]))
    await onSave(normalized)
  }

  const detailFields = definition.fields.filter((field) => field.type !== 'relation')
  const connectionFields = definition.fields.filter((field) => field.type === 'relation')
  const fields = (items: ModuleField[]) => <FieldGroup>{items.map((field) => { const invalid = Boolean(submitted && field.required && !String(values[field.key] ?? '').trim()); return <Field key={field.key} data-invalid={invalid} data-disabled={readOnly}>{field.type !== 'checkbox' && <FieldLabel htmlFor={`record-${field.key}`}>{field.label}</FieldLabel>}<FieldControl field={field} value={values[field.key]} onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))} invalid={invalid} options={options[field.key] ?? []} disabled={readOnly} />{invalid && <FieldError>{field.label} is required.</FieldError>}</Field> })}</FieldGroup>

  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent onCloseAutoFocus={(event) => { const target = returnFocusRef?.current; if (target?.isConnected) { event.preventDefault(); target.focus() } }} className="flex w-full flex-col sm:max-w-lg"><SheetHeader><SheetTitle>{record ? `${readOnly ? 'View' : 'Edit'} ${definition.singular}` : `Create ${definition.singular}`}</SheetTitle><SheetDescription>{definition.description}</SheetDescription></SheetHeader><form onSubmit={submit} className="flex min-h-0 flex-1 flex-col"><div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">{connectionFields.length ? <Tabs defaultValue="details"><TabsList><TabsTrigger value="details">Details</TabsTrigger><TabsTrigger value="connections">Connections</TabsTrigger></TabsList><TabsContent value="details" className="pt-4">{fields(detailFields)}</TabsContent><TabsContent value="connections" className="pt-4">{fields(connectionFields)}</TabsContent></Tabs> : fields(detailFields)}</div><SheetFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{readOnly ? 'Close' : 'Cancel'}</Button>{!readOnly && <Button type="submit" disabled={loading}>{loading && <Spinner data-icon="inline-start" />}{record ? 'Save changes' : `Create ${definition.singular}`}</Button>}</SheetFooter></form></SheetContent></Sheet>
}

function FieldControl({ field, value, onChange, invalid, options, disabled }: { field: ModuleField; value: unknown; onChange: (value: unknown) => void; invalid: boolean; options: Array<{ value: string; label: string }>; disabled: boolean }) {
  if (field.type === 'select') return <Select value={String(value ?? field.options?.[0] ?? '')} onValueChange={onChange} disabled={disabled}><SelectTrigger id={`record-${field.key}`} aria-invalid={invalid}><SelectValue placeholder={`Select ${field.label.toLowerCase()}`} /></SelectTrigger><SelectContent><SelectGroup>{field.options?.map((option) => <SelectItem key={option} value={option}>{option.replaceAll('_', ' ')}</SelectItem>)}</SelectGroup></SelectContent></Select>
  if (field.type === 'relation') { const selected = value ? String(value) : '__none__'; return <Select value={selected} onValueChange={(next) => onChange(next === '__none__' ? null : next)} disabled={disabled}><SelectTrigger id={`record-${field.key}`} aria-invalid={invalid}><SelectValue placeholder={`Select ${field.label.toLowerCase()}`} /></SelectTrigger><SelectContent><SelectGroup>{field.relation?.optional && <SelectItem value="__none__">No {field.label.toLowerCase()}</SelectItem>}{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent></Select> }
  if (field.type === 'textarea') return <Textarea id={`record-${field.key}`} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} aria-invalid={invalid} placeholder={field.placeholder} rows={5} disabled={disabled} />
  if (field.type === 'checkbox') return <label className="flex items-center gap-3 rounded-md border p-3"><Checkbox id={`record-${field.key}`} checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked === true)} disabled={disabled} /><span><span className="block text-sm font-medium">{field.label}</span><FieldDescription>Turn this setting on for the workspace.</FieldDescription></span></label>
  return <Input id={`record-${field.key}`} type={field.type} value={String(value ?? '')} onChange={(event) => onChange(field.type === 'number' ? Number(event.target.value) : event.target.value)} aria-invalid={invalid} required={field.required} placeholder={field.placeholder} disabled={disabled} />
}

function defaultValue(field: ModuleField) {
  if (field.type === 'checkbox') return true
  if (field.type === 'select') return field.options?.[0] ?? ''
  if (field.type === 'datetime-local') return new Date().toISOString().slice(0, 16)
  return ''
}

function displayValue(value: unknown) { return value && typeof value === 'object' ? JSON.stringify(value, null, 2) : value }
