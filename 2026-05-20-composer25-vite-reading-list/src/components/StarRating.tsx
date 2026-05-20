type StarRatingProps = {
  value: number | null;
  onChange: (value: number) => void;
  readonly?: boolean;
};

export function StarRating({ value, onChange, readonly }: StarRatingProps) {
  return (
    <div className="flex gap-0.5" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange(n)}
          className={`text-lg leading-none transition-colors ${
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          } ${value != null && n <= value ? "text-accent" : "text-paper-dark"}`}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
