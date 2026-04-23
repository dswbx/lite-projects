import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../supabase";

export function AuthForm() {
   const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [err, setErr] = useState<string | null>(null);
   const [busy, setBusy] = useState(false);

   async function submit(e: FormEvent) {
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
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
         <div className="mb-4 flex gap-2 text-sm">
            <button
               onClick={() => setMode("sign-in")}
               className={`rounded-md px-3 py-1.5 ${
                  mode === "sign-in"
                     ? "bg-neutral-900 text-white"
                     : "text-neutral-600 hover:bg-neutral-100"
               }`}
            >
               Sign in
            </button>
            <button
               onClick={() => setMode("sign-up")}
               className={`rounded-md px-3 py-1.5 ${
                  mode === "sign-up"
                     ? "bg-neutral-900 text-white"
                     : "text-neutral-600 hover:bg-neutral-100"
               }`}
            >
               Sign up
            </button>
         </div>
         <form onSubmit={submit} className="flex flex-col gap-3">
            <input
               type="email"
               placeholder="email"
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               required
               className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
            <input
               type="password"
               placeholder="password (min 6 chars)"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               required
               minLength={6}
               className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            <button
               type="submit"
               disabled={busy}
               className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
            >
               {busy ? "..." : mode === "sign-in" ? "Sign in" : "Sign up"}
            </button>
         </form>
      </div>
   );
}
