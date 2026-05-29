import { useState } from "react";
import {
  addGuest,
  deleteEvent,
  formatEventDate,
  removeGuest,
  rsvpSummary,
  updateEvent,
  updateGuestRsvp,
} from "../lib/events";
import type { EventWithGuests, RsvpStatus } from "../types";
import { EventForm } from "./EventForm";

type Props = {
  event: EventWithGuests;
  userId: string;
  onBack: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
};

const rsvpOptions: { value: RsvpStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export function EventDetail({
  event,
  userId,
  onBack,
  onUpdated,
  onDeleted,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [newGuest, setNewGuest] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guests = [...(event.guests ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  async function handleRsvpChange(guestId: string, status: RsvpStatus) {
    setError(null);
    try {
      await updateGuestRsvp(guestId, status);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update RSVP");
    }
  }

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!newGuest.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addGuest(userId, event.id, newGuest);
      setNewGuest("");
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add guest");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveGuest(guestId: string) {
    setError(null);
    try {
      await removeGuest(guestId);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove guest");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${event.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteEvent(event.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete event");
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          ← Back to event
        </button>
        <h2 className="mt-4 font-display text-2xl font-semibold">Edit event</h2>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <EventForm
            initial={{
              name: event.name,
              event_date: event.event_date,
              location: event.location,
              guestNames: [],
            }}
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            onSubmit={async (input) => {
              await updateEvent(event.id, input);
              setEditing(false);
              onUpdated();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-muted hover:text-ink"
      >
        ← All events
      </button>
      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold">{event.name}</h2>
          <p className="mt-2 text-sage font-medium">
            {formatEventDate(event.event_date)}
          </p>
          <p className="mt-1 text-muted">{event.location}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-border/40"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="rounded-lg border border-accent/30 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </header>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-xl font-semibold">Guests</h3>
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            {rsvpSummary(guests)}
          </span>
        </div>
        {guests.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No guests yet. Add someone below.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {guests.map((guest) => (
              <li
                key={guest.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
              >
                <span className="font-medium text-ink">{guest.name}</span>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`rsvp-${guest.id}`}>
                    RSVP for {guest.name}
                  </label>
                  <select
                    id={`rsvp-${guest.id}`}
                    value={guest.rsvp_status}
                    onChange={(e) =>
                      handleRsvpChange(guest.id, e.target.value as RsvpStatus)
                    }
                    className="rounded-lg border border-border bg-cream px-3 py-1.5 text-sm outline-none focus:border-accent"
                  >
                    {rsvpOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveGuest(guest.id)}
                    className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-border/50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddGuest} className="mt-6 flex flex-wrap gap-2">
          <input
            value={newGuest}
            onChange={(e) => setNewGuest(e.target.value)}
            placeholder="Add guest name"
            className="min-w-[12rem] flex-1 rounded-lg border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy || !newGuest.trim()}
            className="rounded-lg bg-sage px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            Add guest
          </button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-accent" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
