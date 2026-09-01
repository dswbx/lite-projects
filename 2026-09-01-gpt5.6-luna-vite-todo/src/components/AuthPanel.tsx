import { useState } from "react";
import { ArrowUpRight, KeyRound } from "lucide-react";

type AuthMode = "signin" | "signup";

type AuthPanelProps = {
  onSubmit: (email: string, password: string, mode: AuthMode) => Promise<void>;
  error: string | null;
  message: string | null;
};

export function AuthPanel({ onSubmit, error, message }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(email.trim(), password, mode);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-card__mark"><KeyRound size={18} strokeWidth={1.8} /></div>
      <p className="eyebrow">Your quiet corner</p>
      <h2 id="auth-title">Keep the day in reach.</h2>
      <p className="auth-card__intro">
        A small, private list for the things you want to carry forward.
      </p>

      <div className="auth-tabs" role="tablist" aria-label="Account access">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signin"}
          className={mode === "signin" ? "auth-tab is-active" : "auth-tab"}
          onClick={() => setMode("signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          className={mode === "signup" ? "auth-tab is-active" : "auth-tab"}
          onClick={() => setMode("signup")}
        >
          Create account
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            minLength={6}
            required
          />
        </label>
        {error && <p className="form-message form-message--error" role="alert">{error}</p>}
        {message && <p className="form-message form-message--success" role="status">{message}</p>}
        <button className="button button--dark button--full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Opening your list…" : mode === "signin" ? "Open my list" : "Make my list"}
          {!isSubmitting && <ArrowUpRight size={17} />}
        </button>
      </form>
      <p className="auth-card__note">Your tasks stay in this local workspace and are scoped to your account.</p>
    </section>
  );
}
