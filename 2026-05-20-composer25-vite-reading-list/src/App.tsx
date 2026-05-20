import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { AuthForm } from "./components/AuthForm";
import { BookList } from "./components/BookList";

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
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-display text-xl text-ink-muted">Opening your shelf…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="mb-10 border-b border-paper-dark/70 pb-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Personal library
          </p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Reading List
            </h1>
            {session ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-ink-muted">{session.user.email}</span>
                <button
                  type="button"
                  onClick={() => supabase.auth.signOut()}
                  className="rounded-md border border-paper-dark px-3 py-1.5 text-ink-muted transition-colors hover:border-accent hover:text-accent"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
            Track what you want to read, what you are reading, and what you have
            finished. Only you can see your books.
          </p>
        </header>

        {session ? (
          <BookList session={session} />
        ) : (
          <div className="space-y-6">
            <p className="rounded-lg border border-paper-dark/60 bg-white/50 px-4 py-3 text-sm text-ink-muted">
              Sign in or create an account to manage your private reading list.
            </p>
            <AuthForm />
          </div>
        )}
      </div>
    </div>
  );
}
