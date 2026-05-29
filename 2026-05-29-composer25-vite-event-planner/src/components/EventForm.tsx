import { useState } from "react";
import type { EventInput } from "../lib/events";

type Props = {
  initial?: EventInput;
  submitLabel: string;
  onSubmit: (input: EventInput) => Promise<void>;
  onCancel?: () => void;
};

const empty: EventInput = {
  name: "",
  event_date: "",
  location: "",
  guestNames: [""],
};

function toLocalDatetimeValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initial?.name ?? empty.name);
  const [eventDate, setEventDate] = useState(
    initial?.event_date ? toLocalDatetimeValue(initial.event_date) : "",
  );
  const [location, setLocation] = useState(initial?.location ?? empty.location);
  const [guestNames, setGuestNames] = useState(
    initial?.guestNames?.length ? initial.guestNames : [""],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showGuests = initial === undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        name,
        event_date: eventDate,
        location,
        guestNames: showGuests ? guestNames : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save event");
    } finally {
      setBusy(false);
    }
  }

  function updateGuest(index: number, value: string) {
    setGuestNames((prev) => prev.map((g, i) => (i === index ? value : g)));
  }

  function addGuestRow() {
    setGuestNames((prev) => [...prev, ""]);
  }

  function removeGuestRow(index: number) {
    setGuestNames((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium text-ink">Event name</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Summer garden party"
          className="mt-1 w-full rounded-lg border border-border bg-cream px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink">Date & time</span>
        <input
          type="datetime-local"
          required
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-cream px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink">Location</span>
        <input
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="123 Oak Street"
          className="mt-1 w-full rounded-lg border border-border bg-cream px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>
      {showGuests && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">Guest list</legend>
          <p className="text-xs text-muted">
            Add names now; you can track RSVPs after saving.
          </p>
          {guestNames.map((guest, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={guest}
                onChange={(e) => updateGuest(index, e.target.value)}
                placeholder="Guest name"
                className="flex-1 rounded-lg border border-border bg-cream px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              {guestNames.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGuestRow(index)}
                  className="rounded-lg px-3 text-sm text-muted hover:bg-border/60"
                  aria-label="Remove guest row"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addGuestRow}
            className="text-sm font-medium text-sage hover:underline"
          >
            + Add another guest
          </button>
        </fieldset>
      )}
      {error && (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-5 py-2.5 font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-5 py-2.5 text-ink hover:bg-border/40"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
