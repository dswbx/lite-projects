type SetDraft = {
  set_number: number
  reps: string
  weight_lbs: string
}

type Props = {
  set: SetDraft
  onChange: (next: SetDraft) => void
  onRemove: () => void
  canRemove: boolean
}

export function SetRow({ set, onChange, onRemove, canRemove }: Props) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr_1fr_2rem] items-center gap-2">
      <span className="font-display text-sm font-semibold text-muted">{set.set_number}</span>
      <input
        type="number"
        min={1}
        placeholder="Reps"
        value={set.reps}
        onChange={(e) => onChange({ ...set, reps: e.target.value })}
        className="rounded-md border border-steel bg-iron px-3 py-2 text-sm text-chalk outline-none focus:border-ember"
      />
      <input
        type="number"
        min={0}
        step={2.5}
        placeholder="lbs"
        value={set.weight_lbs}
        onChange={(e) => onChange({ ...set, weight_lbs: e.target.value })}
        className="rounded-md border border-steel bg-iron px-3 py-2 text-sm text-chalk outline-none focus:border-ember"
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className="text-muted hover:text-chalk disabled:invisible"
        aria-label="Remove set"
      >
        ×
      </button>
    </div>
  )
}

export type { SetDraft }
