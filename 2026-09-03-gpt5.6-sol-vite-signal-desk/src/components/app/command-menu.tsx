import { allNavigation } from '@/components/app/module-definitions'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from '@/components/ui/command'

export function CommandMenu({ open, onOpenChange, onNavigate, items = allNavigation }: { open: boolean; onOpenChange: (open: boolean) => void; onNavigate: (path: string) => void; items?: typeof allNavigation }) {
  return <CommandDialog open={open} onOpenChange={onOpenChange}><CommandInput placeholder="Search modules and actions…" /><CommandList><CommandEmpty>No matching destination.</CommandEmpty><CommandGroup heading="Go to">{items.map((item, index) => { const Icon = item.icon; return <CommandItem key={item.key} onSelect={() => { onNavigate(item.key); onOpenChange(false) }}><Icon aria-hidden="true" />{item.label}{index < 9 && <CommandShortcut>⌘{index + 1}</CommandShortcut>}</CommandItem> })}</CommandGroup></CommandList></CommandDialog>
}
