import { expect, type Page } from "@playwright/test";

let counter = 0;

/** Unique email per call so reruns (and post-upgrade migrated data) never collide. */
export function uniqueEmail(): string {
  counter += 1;
  return `e2e-${Date.now()}-${counter}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

export const PASSWORD = "password123";

/** A datetime-local value (YYYY-MM-DDTHH:MM) a week in the future, so the event lands in "Upcoming". */
export function futureDatetimeLocal(daysAhead = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(18, 30, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function signUp(page: Page, email: string, password = PASSWORD) {
  await page.goto("/");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
  // Signed-in chrome appears (email confirmations are disabled).
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
}

export type NewEvent = {
  name: string;
  location: string;
  guests?: string[];
  date?: string;
};

/** Create an event from the list view; returns to the list when done. */
export async function createEvent(page: Page, ev: NewEvent) {
  await page.getByRole("button", { name: "+ New event" }).click();
  await page.getByLabel("Event name").fill(ev.name);
  await page.getByLabel("Date & time").fill(ev.date ?? futureDatetimeLocal());
  await page.getByLabel("Location").fill(ev.location);

  const guests = ev.guests ?? [];
  for (let i = 0; i < guests.length; i++) {
    if (i > 0) await page.getByRole("button", { name: "+ Add another guest" }).click();
    await page.getByPlaceholder("Guest name").nth(i).fill(guests[i]);
  }

  await page.getByRole("button", { name: "Create event" }).click();
  // Back on the list with the new event present.
  await expect(page.getByRole("heading", { name: "Upcoming" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: ev.name })).toBeVisible();
}

/** Open an event's detail view from the list. */
export async function openEvent(page: Page, name: string) {
  await page.getByRole("heading", { level: 3, name }).click();
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
}
