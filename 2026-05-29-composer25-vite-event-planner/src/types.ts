export type RsvpStatus = "pending" | "yes" | "no";

export type EventRow = {
  id: string;
  user_id: string;
  name: string;
  event_date: string;
  location: string;
  created_at: string;
  updated_at: string;
};

export type GuestRow = {
  id: string;
  event_id: string;
  user_id: string;
  name: string;
  rsvp_status: RsvpStatus;
  created_at: string;
};

export type EventWithGuests = EventRow & {
  guests: GuestRow[];
};
