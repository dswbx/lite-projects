import { useState } from "react";
import { supabase } from "../supabase";

export function AuthForm() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) setErr(error.message);
  }

  return (
    <div className="rounded-xl border border-paper-dark/80 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
      <p className="mb-4 font-display text-xl text-ink">
        {mode === "sign-in" ? "Welcome back" : "Start your shelf"}
      </p>
      <div className="mb-4 flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("sign-in")}
          className={`rounded-md px-3 py-1.5 transition-colors ${
            mode === "sign-in"
              ? "bg-shelf text-paper"
              : "text-ink-muted hover:bg-paper-dark/60"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("sign-up")}
          className={`rounded-md px-3 py-1.5 transition-colors ${
            mode === "sign-up"
              ? "bg-shelf text-paper"
              : "text-ink-muted hover:bg-paper-dark/60"
          }`}
        >
          Sign up
        </button>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-md border border-paper-dark bg-paper/50 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          type="password"
          placeholder="Password (6+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="rounded-md border border-paper-dark bg-paper/50 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        {err ? <p className="text-sm text-red-700">{err}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
