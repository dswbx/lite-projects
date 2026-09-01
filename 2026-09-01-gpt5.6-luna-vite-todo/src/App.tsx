import { useEffect, useMemo, useState } from "react";
import { LogOut, Sparkles } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { AuthPanel } from "./components/AuthPanel";
import { TaskComposer } from "./components/TaskComposer";
import { TaskList } from "./components/TaskList";
import { supabase, type Task } from "./lib/supabase";

type AuthMode = "signin" | "signup";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  async function loadTasks(userId: string) {
    setIsLoadingTasks(true);
    setTaskError(null);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setTaskError(error.message);
      setTasks([]);
    } else {
      setTasks((data ?? []) as Task[]);
    }
    setIsLoadingTasks(false);
  }

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) void loadTasks(data.session.user.id);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setAuthError(null);
      setAuthMessage(null);
      if (nextSession) void loadTasks(nextSession.user.id);
      else setTasks([]);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleAuth(email: string, password: string, mode: AuthMode) {
    setAuthError(null);
    setAuthMessage(null);
    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setAuthError(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setAuthMessage("Account created. Check your email to finish signing in.");
    }
  }

  async function handleCreate(title: string) {
    if (!session) return;
    setTaskError(null);
    const { data, error } = await supabase
      .from("tasks")
      .insert({ user_id: session.user.id, title })
      .select()
      .single();
    if (error) {
      setTaskError(error.message);
      return;
    }
    if (data) setTasks((current) => [data as Task, ...current]);
  }

  async function handleToggle(task: Task) {
    setBusyTaskId(task.id);
    setTaskError(null);
    const { error } = await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id)
      .eq("user_id", task.user_id);
    if (error) {
      setTaskError(error.message);
    } else {
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed: !item.completed } : item));
    }
    setBusyTaskId(null);
  }

  async function handleDelete(id: string) {
    if (!session) return;
    setBusyTaskId(id);
    setTaskError(null);
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);
    if (error) {
      setTaskError(error.message);
    } else {
      setTasks((current) => current.filter((task) => task.id !== id));
    }
    setBusyTaskId(null);
  }

  async function handleSignOut() {
    setTaskError(null);
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(error.message);
  }

  const completedCount = useMemo(() => tasks.filter((task) => task.completed).length, [tasks]);
  const remainingCount = tasks.length - completedCount;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  if (isLoading) {
    return <main className="loading-screen"><div className="loading-stamp">daymark<span>.</span></div></main>;
  }

  return (
    <main className="app-shell">
      <div className="ambient-mark ambient-mark--one" aria-hidden="true" />
      <div className="ambient-mark ambient-mark--two" aria-hidden="true" />
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Daymark home">daymark<span>.</span></a>
        {session && (
          <div className="account-chip">
            <span className="account-dot" aria-hidden="true" />
            <span className="account-email">{session.user.email}</span>
            <button className="icon-button" type="button" onClick={() => void handleSignOut()} aria-label="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </header>

      {!session ? (
        <section className="welcome-layout">
          <div className="welcome-copy">
            <p className="eyebrow"><Sparkles size={14} /> A personal task list</p>
            <h1>Make room<br /><em>for what matters.</em></h1>
            <p className="welcome-lede">Daymark keeps your next steps close, clear, and entirely yours.</p>
            <div className="welcome-detail"><span>01</span><span>Private by design</span><span>Local workspace</span></div>
          </div>
          <AuthPanel onSubmit={handleAuth} error={authError} message={authMessage} />
        </section>
      ) : (
        <section className="workspace">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">Your day, marked</p>
              <h1>What’s on your slate?</h1>
            </div>
            <div className="progress-note" aria-label={`${progress}% complete`}>
              <div className="progress-ring" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}>
                <span>{progress}<small>%</small></span>
              </div>
              <div><strong>{remainingCount} to go</strong><span>{completedCount} complete</span></div>
            </div>
          </div>
          <TaskComposer onCreate={handleCreate} disabled={isLoadingTasks} />
          {taskError && <p className="form-message form-message--error task-error" role="alert">{taskError}</p>}
          <div className="list-heading"><span>Tasks</span><span>{tasks.length === 0 ? "A fresh page" : `${tasks.length} ${tasks.length === 1 ? "item" : "items"}`}</span></div>
          <TaskList tasks={tasks} busyTaskId={busyTaskId} onToggle={handleToggle} onDelete={handleDelete} />
          <p className="privacy-line">Only you can see and change these tasks.</p>
        </section>
      )}
      <footer className="site-footer"><span>DAYMARK / 2026</span><span>Small steps, kept visible.</span></footer>
    </main>
  );
}

export default App;
