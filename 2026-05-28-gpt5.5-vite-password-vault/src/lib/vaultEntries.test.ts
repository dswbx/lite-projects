import { describe, expect, it } from "vitest";
import { filterVisibleEntries, type VaultEntryView } from "./vaultEntries";

const entries: VaultEntryView[] = [
  {
    id: "1",
    userId: "alice",
    siteName: "Email Desk",
    username: "alice@example.com",
    encryptedPassword: "cipher-1",
    passwordIv: "iv-1",
    createdAt: "2026-05-28T06:00:00.000Z",
    updatedAt: "2026-05-28T06:00:00.000Z",
  },
  {
    id: "2",
    userId: "bob",
    siteName: "Email Desk",
    username: "bob@example.com",
    encryptedPassword: "cipher-2",
    passwordIv: "iv-2",
    createdAt: "2026-05-28T06:01:00.000Z",
    updatedAt: "2026-05-28T06:01:00.000Z",
  },
  {
    id: "3",
    userId: "alice",
    siteName: "Bank Portal",
    username: "alice-bank",
    encryptedPassword: "cipher-3",
    passwordIv: "iv-3",
    createdAt: "2026-05-28T06:02:00.000Z",
    updatedAt: "2026-05-28T06:02:00.000Z",
  },
];

describe("filterVisibleEntries", () => {
  it("returns only the signed-in user's entries that match a site search", () => {
    const result = filterVisibleEntries(entries, "alice", "email");

    expect(result).toEqual([entries[0]]);
  });

  it("sorts a user's matching entries by site name", () => {
    const result = filterVisibleEntries(entries, "alice", "");

    expect(result.map((entry) => entry.siteName)).toEqual(["Bank Portal", "Email Desk"]);
  });
});
