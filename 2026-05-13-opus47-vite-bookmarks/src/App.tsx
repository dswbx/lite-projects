import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Auth } from "./Auth";
import { Dashboard } from "./Dashboard";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-full flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  return session ? <Dashboard session={session} /> : <Auth />;
}
