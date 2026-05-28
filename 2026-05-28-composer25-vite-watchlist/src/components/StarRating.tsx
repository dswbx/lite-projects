type Props = {
  value: number | null
  onChange: (rating: number) => void
  disabled?: boolean
}

export function StarRating({ value, onChange, disabled }: Props) {
  return (
    <div className="flex gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          className={`text-xl transition ${disabled ? 'cursor-default' : 'hover:scale-110'} ${
            value !== null && star <= value ? 'text-amber' : 'text-panel-edge'
          }`}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
