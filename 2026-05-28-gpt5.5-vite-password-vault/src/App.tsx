import type { Session } from "@supabase/supabase-js";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { decryptSecret, encryptSecret } from "./lib/crypto";
import { supabase } from "./lib/supabase";
import {
  buildVaultEntryWrite,
  filterVisibleEntries,
  mapVaultEntryRow,
  type VaultEntryForm,
  type VaultEntryView,
} from "./lib/vaultEntries";

const emptyForm: VaultEntryForm = {
  siteName: "",
  username: "",
  password: "",
};

type AuthMode = "sign-in" | "sign-up";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [vaultPassphrase, setVaultPassphrase] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [entries, setEntries] = useState<VaultEntryView[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<VaultEntryForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");

  const user = session?.user ?? null;
  const ownerEmail = user?.email ?? "";
  const visibleEntries = useMemo(() => filterVisibleEntries(entries, user?.id ?? "", search), [entries, user?.id, search]);
  const needsUnlock = Boolean(user && !vaultPassphrase);

  const loadEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      return;
    }

    let query = supabase.from("vault_entries").select("*").order("site_name", { ascending: true });
    if (search.trim()) {
      query = query.ilike("site_name", `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    setEntries((data ?? []).map(mapVaultEntryRow));
  }, [search, user]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthEmail(data.session?.user.email ?? "");
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthEmail(nextSession?.user.email ?? "");
      if (!nextSession) {
        setVaultPassphrase("");
        setEntries([]);
        setRevealedPasswords({});
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadEntries().catch((error: Error) => setMessage(error.message));
  }, [loadEntries]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setMessage("");

    try {
      const credentials = { email: authEmail.trim(), password: authPassword };
      const response =
        authMode === "sign-up"
          ? await supabase.auth.signUp(credentials)
          : await supabase.auth.signInWithPassword(credentials);

      if (response.error) {
        throw response.error;
      }

      if (authMode === "sign-up" && !response.data.session) {
        const signInResponse = await supabase.auth.signInWithPassword(credentials);
        if (signInResponse.error) {
          throw signInResponse.error;
        }
      }

      setVaultPassphrase(authPassword);
      setUnlockPassword("");
      setAuthPassword("");
      setMessage(authMode === "sign-up" ? "Your vault is ready." : "Vault opened.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open the vault.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUnlockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ownerEmail) {
      return;
    }

    setIsBusy(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: ownerEmail, password: unlockPassword });
      if (error) {
        throw error;
      }

      setVaultPassphrase(unlockPassword);
      setUnlockPassword("");
      setMessage("Vault unlocked.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not unlock the vault.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleVaultSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !vaultPassphrase || !ownerEmail) {
      setMessage("Sign in and unlock your vault first.");
      return;
    }

    setIsBusy(true);
    setMessage("");

    try {
      const encryptedPassword = await encryptSecret(form.password, ownerEmail, vaultPassphrase);
      const payload = buildVaultEntryWrite(form, encryptedPassword);
      const response = editingId
        ? await supabase.from("vault_entries").update(payload).eq("id", editingId)
        : await supabase.from("vault_entries").insert({
            ...payload,
            id: crypto.randomUUID(),
            user_id: user.id,
            created_at: new Date().toISOString(),
          });

      if (response.error) {
        throw response.error;
      }

      setForm(emptyForm);
      setEditingId(null);
      setRevealedPasswords({});
      await loadEntries();
      setMessage(editingId ? "Entry updated." : "Entry saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the entry.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleEdit(entry: VaultEntryView) {
    if (!ownerEmail || !vaultPassphrase) {
      setMessage("Unlock your vault before editing.");
      return;
    }

    try {
      const password = await decryptSecret({ ciphertext: entry.encryptedPassword, iv: entry.passwordIv }, ownerEmail, vaultPassphrase);
      setForm({ siteName: entry.siteName, username: entry.username, password });
      setEditingId(entry.id);
      setMessage(`Editing ${entry.siteName}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not decrypt this password.");
    }
  }

  async function handleReveal(entry: VaultEntryView) {
    if (revealedPasswords[entry.id]) {
      setRevealedPasswords((current) => {
        const next = { ...current };
        delete next[entry.id];
        return next;
      });
      return;
    }

    if (!ownerEmail || !vaultPassphrase) {
      setMessage("Unlock your vault before revealing passwords.");
      return;
    }

    try {
      const password = await decryptSecret({ ciphertext: entry.encryptedPassword, iv: entry.passwordIv }, ownerEmail, vaultPassphrase);
      setRevealedPasswords((current) => ({ ...current, [entry.id]: password }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not decrypt this password.");
    }
  }

  async function handleDelete(entry: VaultEntryView) {
    setIsBusy(true);
    setMessage("");

    try {
      const { error } = await supabase.from("vault_entries").delete().eq("id", entry.id);
      if (error) {
        throw error;
      }

      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setRevealedPasswords((current) => {
        const next = { ...current };
        delete next[entry.id];
        return next;
      });
      setMessage("Entry deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete the entry.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSignOut() {
    setIsBusy(true);
    setMessage("");
    await supabase.auth.signOut();
    setForm(emptyForm);
    setEditingId(null);
    setIsBusy(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl shadow-slate-950/40">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">personal password vault</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Keep local vault entries separated by user.</h1>
              <p className="mt-4 max-w-3xl text-lg text-slate-300">
                Sign in, save a site name, username, and encrypted password, then search your own entries by site name. This prototype stores data in the Supabase Lite database that runs with the Vite dev server.
              </p>
            </div>
            {user ? (
              <button className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10" onClick={handleSignOut} disabled={isBusy}>
                Sign out
              </button>
            ) : null}
          </div>
        </header>

        {message ? <div className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-4 text-cyan-100">{message}</div> : null}

        {!user ? (
          <section className="mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-white p-6 text-slate-950 shadow-2xl">
            <div className="mb-6 flex rounded-full bg-slate-100 p-1">
              <button className={`flex-1 rounded-full px-4 py-2 font-semibold ${authMode === "sign-in" ? "bg-slate-950 text-white" : "text-slate-600"}`} onClick={() => setAuthMode("sign-in")} type="button">
                Sign in
              </button>
              <button className={`flex-1 rounded-full px-4 py-2 font-semibold ${authMode === "sign-up" ? "bg-slate-950 text-white" : "text-slate-600"}`} onClick={() => setAuthMode("sign-up")} type="button">
                Create account
              </button>
            </div>
            <form className="grid gap-4" onSubmit={handleAuthSubmit}>
              <label className="grid gap-2 text-sm font-semibold">
                Email
                <input className="rounded-2xl border border-slate-200 px-4 py-3 font-normal" type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Password
                <input className="rounded-2xl border border-slate-200 px-4 py-3 font-normal" type="password" minLength={8} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required />
              </label>
              <button className="rounded-2xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60" disabled={isBusy}>
                {authMode === "sign-up" ? "Create my vault" : "Open my vault"}
              </button>
            </form>
          </section>
        ) : needsUnlock ? (
          <section className="mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-white p-6 text-slate-950 shadow-2xl">
            <h2 className="text-2xl font-bold">Unlock your vault</h2>
            <p className="mt-2 text-slate-600">Enter your account password again so this browser session can decrypt saved passwords. The passphrase stays in memory and is not stored.</p>
            <form className="mt-6 grid gap-4" onSubmit={handleUnlockSubmit}>
              <label className="grid gap-2 text-sm font-semibold">
                Password for {ownerEmail}
                <input className="rounded-2xl border border-slate-200 px-4 py-3 font-normal" type="password" minLength={8} value={unlockPassword} onChange={(event) => setUnlockPassword(event.target.value)} required />
              </label>
              <button className="rounded-2xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60" disabled={isBusy}>
                Unlock
              </button>
            </form>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <section className="rounded-3xl border border-white/10 bg-white p-6 text-slate-950 shadow-2xl">
              <h2 className="text-2xl font-bold">{editingId ? "Edit entry" : "Save a new entry"}</h2>
              <form className="mt-6 grid gap-4" onSubmit={handleVaultSubmit}>
                <label className="grid gap-2 text-sm font-semibold">
                  Site name
                  <input className="rounded-2xl border border-slate-200 px-4 py-3 font-normal" value={form.siteName} onChange={(event) => setForm((current) => ({ ...current, siteName: event.target.value }))} required />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Username
                  <input className="rounded-2xl border border-slate-200 px-4 py-3 font-normal" value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} required />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Password
                  <input className="rounded-2xl border border-slate-200 px-4 py-3 font-normal" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
                </label>
                <div className="flex gap-3">
                  <button className="flex-1 rounded-2xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60" disabled={isBusy}>
                    {editingId ? "Update entry" : "Save entry"}
                  </button>
                  {editingId ? (
                    <button className="rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-700" onClick={() => { setEditingId(null); setForm(emptyForm); }} type="button">
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-slate-400">Signed in as {ownerEmail}</p>
                  <h2 className="mt-1 text-3xl font-bold text-white">Your vault</h2>
                </div>
                <label className="grid gap-2 text-sm font-semibold text-slate-200 sm:w-80">
                  Search by site name
                  <input className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 font-normal text-white outline-none ring-cyan-300/60 focus:ring-2" placeholder="Try bank, email, or shop" value={search} onChange={(event) => setSearch(event.target.value)} />
                </label>
              </div>

              <div className="mt-6 grid gap-4">
                {visibleEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center text-slate-300">
                    No entries match this search yet.
                  </div>
                ) : (
                  visibleEntries.map((entry) => (
                    <article className="rounded-2xl border border-white/10 bg-slate-900/80 p-5" key={entry.id}>
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-white">{entry.siteName}</h3>
                          <p className="mt-1 text-slate-300">{entry.username}</p>
                          <p className="mt-3 rounded-xl bg-slate-950 px-3 py-2 font-mono text-sm text-cyan-200">
                            {revealedPasswords[entry.id] ?? "••••••••••••"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20" onClick={() => handleReveal(entry)} type="button">
                            {revealedPasswords[entry.id] ? "Hide" : "Reveal"}
                          </button>
                          <button className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20" onClick={() => handleEdit(entry)} type="button">
                            Edit
                          </button>
                          <button className="rounded-full bg-rose-400/20 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-400/30" onClick={() => handleDelete(entry)} type="button">
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        <aside className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 text-sm text-amber-100">
          This is a local prototype built on an alpha package. Use it to test the app flow, not to store real passwords.
        </aside>
      </div>
    </main>
  );
}

export default App;
