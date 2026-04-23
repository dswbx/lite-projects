import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { AuthForm } from "./components/AuthForm";
import { TodoList } from "./components/TodoList";

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

   if (loading) return null;

   return (
      <div className="min-h-screen bg-neutral-50 text-neutral-900">
         <div className="mx-auto max-w-2xl px-6 py-12">
            <header className="mb-8 flex items-center justify-between">
               <h1 className="text-2xl font-semibold tracking-tight">Todos</h1>
               {session ? (
                  <div className="flex items-center gap-3 text-sm">
                     <span className="text-neutral-600">{session.user.email}</span>
                     <button
                        onClick={() => supabase.auth.signOut()}
                        className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 hover:bg-neutral-100"
                     >
                        Sign out
                     </button>
                  </div>
               ) : null}
            </header>
            {session ? (
               <TodoList session={session} />
            ) : (
               <>
                  <p className="mb-4 text-sm text-neutral-600">
                     Not signed in. Showing public todos only. Sign in to add your own.
                  </p>
                  <TodoList session={null} />
                  <AuthForm />
               </>
            )}
         </div>
      </div>
   );
}
