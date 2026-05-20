import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  window.location.origin,
  "any-string-works-for-now",
);

export type BookStatus = "want_to_read" | "reading" | "finished";

export type Book = {
  id: number;
  user_id: string;
  title: string;
  author: string;
  status: BookStatus;
  rating: number | null;
  review: string | null;
  created_at: string;
  updated_at: string;
};

export const STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: "Want to read",
  reading: "Reading",
  finished: "Finished",
};
