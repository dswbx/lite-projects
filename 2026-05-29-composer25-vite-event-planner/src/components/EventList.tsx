import {
  formatEventDate,
  rsvpSummary,
} from "../lib/events";
import type { EventWithGuests } from "../types";

type Props = {
  events: EventWithGuests[];
  onSelect: (id: string) => void;
  onCreate: () => void;
};

export function EventList({ events, onSelect, onCreate }: Props) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Upcoming</h2>
          <p className="mt-1 text-sm text-muted">Sorted by date, soonest first</p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          + New event
        </button>
      </div>
      {events.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
          <p className="font-display text-lg text-ink">No upcoming events</p>
          <p className="mt-2 text-sm text-muted">
            Plan something and invite your guests.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-4 text-sm font-medium text-accent hover:underline"
          >
            Create your first event
          </button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {events.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => onSelect(event.id)}
                className="group w-full rounded-xl border border-border bg-card p-5 text-left shadow-sm transition hover:border-accent/40 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold group-hover:text-accent">
                    {event.name}
                  </h3>
                  <time
                    dateTime={event.event_date}
                    className="text-sm font-medium text-sage"
                  >
                    {formatEventDate(event.event_date)}
                  </time>
                </div>
                <p className="mt-1 text-sm text-muted">{event.location}</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted">
                  {rsvpSummary(event.guests ?? [])}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
