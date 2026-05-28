import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

describe("password encryption helpers", () => {
  it("round-trips a password without storing the raw secret as ciphertext", async () => {
    const encrypted = await encryptSecret("sensitive-password", "owner@example.com", "master-passphrase");

    expect(encrypted.ciphertext).not.toContain("sensitive-password");
    await expect(decryptSecret(encrypted, "owner@example.com", "master-passphrase")).resolves.toBe("sensitive-password");
  });

  it("does not decrypt with another user's passphrase", async () => {
    const encrypted = await encryptSecret("sensitive-password", "owner@example.com", "master-passphrase");

    await expect(decryptSecret(encrypted, "owner@example.com", "wrong-passphrase")).rejects.toThrow();
  });
});
