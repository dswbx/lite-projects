import { supabase } from "./supabase";
import type { EventRow, EventWithGuests, GuestRow, RsvpStatus } from "../types";

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function fetchUpcomingEvents(): Promise<EventWithGuests[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*, guests(*)")
    .gte("event_date", startOfTodayIso())
    .order("event_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as EventWithGuests[];
}

export async function fetchEvent(id: string): Promise<EventWithGuests | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*, guests(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as EventWithGuests | null;
}

export type EventInput = {
  name: string;
  event_date: string;
  location: string;
  guestNames: string[];
};

export async function createEvent(
  userId: string,
  input: EventInput,
): Promise<EventRow> {
  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      event_date: new Date(input.event_date).toISOString(),
      location: input.location.trim(),
    })
    .select()
    .single();

  if (eventError) throw eventError;

  const names = input.guestNames.map((n) => n.trim()).filter(Boolean);
  if (names.length > 0) {
    const { error: guestError } = await supabase.from("guests").insert(
      names.map((name) => ({
        event_id: event.id,
        user_id: userId,
        name,
        rsvp_status: "pending" as RsvpStatus,
      })),
    );
    if (guestError) throw guestError;
  }

  return event as EventRow;
}

export async function updateEvent(
  id: string,
  input: Omit<EventInput, "guestNames">,
): Promise<void> {
  const { error } = await supabase
    .from("events")
    .update({
      name: input.name.trim(),
      event_date: new Date(input.event_date).toISOString(),
      location: input.location.trim(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function addGuest(
  userId: string,
  eventId: string,
  name: string,
): Promise<GuestRow> {
  const { data, error } = await supabase
    .from("guests")
    .insert({
      event_id: eventId,
      user_id: userId,
      name: name.trim(),
      rsvp_status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data as GuestRow;
}

export async function updateGuestRsvp(
  guestId: string,
  rsvp_status: RsvpStatus,
): Promise<void> {
  const { error } = await supabase
    .from("guests")
    .update({ rsvp_status })
    .eq("id", guestId);

  if (error) throw error;
}

export async function removeGuest(guestId: string): Promise<void> {
  const { error } = await supabase.from("guests").delete().eq("id", guestId);
  if (error) throw error;
}

export function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function rsvpSummary(guests: GuestRow[]): string {
  const yes = guests.filter((g) => g.rsvp_status === "yes").length;
  const no = guests.filter((g) => g.rsvp_status === "no").length;
  const pending = guests.filter((g) => g.rsvp_status === "pending").length;
  if (guests.length === 0) return "No guests yet";
  return `${yes} yes · ${no} no · ${pending} pending`;
}
