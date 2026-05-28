export type EncryptedSecret = {
  ciphertext: string;
  iv: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const keyUsages: KeyUsage[] = ["encrypt", "decrypt"];

export async function encryptSecret(secret: string, ownerEmail: string, passphrase: string): Promise<EncryptedSecret> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(ownerEmail, passphrase);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(secret));

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptSecret(secret: EncryptedSecret, ownerEmail: string, passphrase: string): Promise<string> {
  const key = await deriveKey(ownerEmail, passphrase);
  const plainBytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(secret.iv) },
    key,
    base64ToBytes(secret.ciphertext),
  );

  return decoder.decode(plainBytes);
}

async function deriveKey(ownerEmail: string, passphrase: string) {
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(`gpt55-password-vault:${ownerEmail.trim().toLocaleLowerCase()}`),
      iterations: 250_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    keyUsages,
  );
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
