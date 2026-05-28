export type VaultEntryView = {
  id: string;
  userId: string;
  siteName: string;
  username: string;
  encryptedPassword: string;
  passwordIv: string;
  createdAt: string;
  updatedAt: string;
};

export type VaultEntryRow = {
  id: string;
  user_id: string;
  site_name: string;
  username: string;
  password_ciphertext: string;
  password_iv: string;
  created_at: string;
  updated_at: string;
};

export type VaultEntryForm = {
  siteName: string;
  username: string;
  password: string;
};

export type VaultEntryWrite = {
  site_name: string;
  username: string;
  password_ciphertext: string;
  password_iv: string;
  updated_at: string;
};

export function filterVisibleEntries(entries: VaultEntryView[], userId: string, siteSearch: string) {
  const normalizedSearch = siteSearch.trim().toLocaleLowerCase();

  return entries
    .filter((entry) => entry.userId === userId)
    .filter((entry) => entry.siteName.toLocaleLowerCase().includes(normalizedSearch))
    .sort((left, right) => left.siteName.localeCompare(right.siteName));
}

export function mapVaultEntryRow(row: VaultEntryRow): VaultEntryView {
  return {
    id: row.id,
    userId: row.user_id,
    siteName: row.site_name,
    username: row.username,
    encryptedPassword: row.password_ciphertext,
    passwordIv: row.password_iv,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildVaultEntryWrite(form: VaultEntryForm, encryptedPassword: { ciphertext: string; iv: string }): VaultEntryWrite {
  return {
    site_name: form.siteName.trim(),
    username: form.username.trim(),
    password_ciphertext: encryptedPassword.ciphertext,
    password_iv: encryptedPassword.iv,
    updated_at: new Date().toISOString(),
  };
}
