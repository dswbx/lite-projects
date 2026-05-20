import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { AuthForm } from "./components/AuthForm";
import { ContactBook } from "./components/ContactBook";

export function App() {
   const [session, setSession] = useState<Session | null>(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      supabase.auth.getSession().then(({ data }) => {
         setSession(data.session);
         setLoading(false);
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
         setSession(s);
      });
      return () => sub.subscription.unsubscribe();
   }, []);

   if (loading) {
      return (
         <div className="app-shell flex min-h-screen items-center justify-center">
            <p className="text-sm text-[var(--muted)]">Loading…</p>
         </div>
      );
   }

   return (
      <div className="app-shell min-h-screen">
         <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
            {session ? (
               <>
                  <div className="mb-8 flex items-center justify-between gap-4 text-sm">
                     <span className="truncate text-[var(--muted)]">{session.user.email}</span>
                     <button
                        type="button"
                        onClick={() => supabase.auth.signOut()}
                        className="btn-ghost shrink-0"
                     >
                        Sign out
                     </button>
                  </div>
                  <ContactBook session={session} />
               </>
            ) : (
               <div className="mx-auto max-w-md">
                  <div className="mb-10 text-center">
                     <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
                        Personal
                     </p>
                     <h1 className="mt-2 font-display text-4xl text-[var(--ink)]">Contact book</h1>
                     <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                        Sign in to keep your contacts private. Only you can see the people you add.
                     </p>
                  </div>
                  <AuthForm />
               </div>
            )}
         </div>
      </div>
   );
}
