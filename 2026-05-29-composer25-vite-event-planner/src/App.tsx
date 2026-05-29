import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthPanel } from "./components/AuthPanel";
import { EventDetail } from "./components/EventDetail";
import { EventForm } from "./components/EventForm";
import { EventList } from "./components/EventList";
import { createEvent, fetchEvent, fetchUpcomingEvents } from "./lib/events";
import { supabase } from "./lib/supabase";
import type { EventWithGuests } from "./types";

type View =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "detail"; id: string };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [events, setEvents] = useState<EventWithGuests[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventWithGuests | null>(
    null,
  );
  const [view, setView] = useState<View>({ kind: "list" });
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      const data = await fetchUpcomingEvents();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load events");
    } finally {
      setLoadingData(false);
    }
  }, []);

  const loadEventDetail = useCallback(async (id: string) => {
    setLoadingData(true);
    setError(null);
    try {
      const data = await fetchEvent(id);
      setSelectedEvent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load event");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) void loadEvents();
    else {
      setEvents([]);
      setSelectedEvent(null);
      setView({ kind: "list" });
    }
  }, [session, loadEvents]);

  useEffect(() => {
    if (view.kind === "detail" && session) {
      void loadEventDetail(view.id);
    }
  }, [view, session, loadEventDetail]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setView({ kind: "list" });
  }

  async function refreshAfterMutation() {
    await loadEvents();
    if (view.kind === "detail") {
      await loadEventDetail(view.id);
    }
  }

  if (loadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen px-4 py-12">
        <header className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Gather
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-ink md:text-5xl">
            Event Planner
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Create events, invite guests, and track RSVPs. Only you see your
            plans.
          </p>
        </header>
        <AuthPanel />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Gather
            </p>
            <h1 className="font-display text-xl font-semibold">Event Planner</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{session.user.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-border px-3 py-1.5 hover:bg-border/40"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {error && (
          <p
            className="mb-4 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent"
            role="alert"
          >
            {error}
          </p>
        )}
        {loadingData && view.kind !== "list" && (
          <p className="mb-4 text-sm text-muted">Loading…</p>
        )}

        {view.kind === "list" && (
          <EventList
            events={events}
            onSelect={(id) => setView({ kind: "detail", id })}
            onCreate={() => setView({ kind: "create" })}
          />
        )}

        {view.kind === "create" && (
          <div>
            <button
              type="button"
              onClick={() => setView({ kind: "list" })}
              className="text-sm font-medium text-muted hover:text-ink"
            >
              ← Back
            </button>
            <h2 className="mt-4 font-display text-2xl font-semibold">
              New event
            </h2>
            <div className="mt-6 rounded-2xl border border-border bg-card p-6">
              <EventForm
                submitLabel="Create event"
                onCancel={() => setView({ kind: "list" })}
                onSubmit={async (input) => {
                  await createEvent(session.user.id, input);
                  await loadEvents();
                  setView({ kind: "list" });
                }}
              />
            </div>
          </div>
        )}

        {view.kind === "detail" && selectedEvent && (
          <EventDetail
            event={selectedEvent}
            userId={session.user.id}
            onBack={() => setView({ kind: "list" })}
            onUpdated={refreshAfterMutation}
            onDeleted={() => {
              setView({ kind: "list" });
              void loadEvents();
            }}
          />
        )}

        {view.kind === "detail" && !selectedEvent && !loadingData && (
          <p className="text-muted">Event not found.</p>
        )}
      </main>
    </div>
  );
}
