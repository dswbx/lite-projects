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
      <div className="auth-card rounded-2xl border border-[var(--line)] bg-[var(--card)] p-8 shadow-[var(--shadow)]">
         <p className="mb-6 font-display text-2xl text-[var(--ink)]">
            {mode === "sign-in" ? "Welcome back" : "Create your account"}
         </p>
         <div className="flex gap-2 rounded-xl bg-[var(--wash)] p-1">
            <button
               type="button"
               onClick={() => setMode("sign-in")}
               className={tabClass(mode === "sign-in")}
            >
               Sign in
            </button>
            <button
               type="button"
               onClick={() => setMode("sign-up")}
               className={tabClass(mode === "sign-up")}
            >
               Sign up
            </button>
         </div>
         <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            <label className="field">
               <span>Email</span>
               <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
               />
            </label>
            <label className="field">
               <span>Password</span>
               <input
                  type="password"
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
               />
            </label>
            {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}
            <button type="submit" disabled={busy} className="btn-primary">
               {busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
            </button>
         </form>
      </div>
   );
}

function tabClass(active: boolean) {
   return `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
      active
         ? "bg-[var(--accent)] text-white"
         : "text-[var(--muted)] hover:bg-[var(--wash)]"
   }`;
}
