import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { ApplicationStatus, JobApplication, JobListing, Profile, Role } from "./types";
import { applicationsForJob, formatSalary, splitLines } from "./helpers";

type AuthMode = "signin" | "signup";
type View = "jobs" | "employer" | "seeker";

const emptyListing = {
  title: "",
  company_name: "",
  location: "",
  remote_type: "Hybrid",
  employment_type: "Full-time",
  salary_min: "",
  salary_max: "",
  currency: "USD",
  summary: "",
  description: "",
  responsibilities: "",
  requirements: "",
  benefits: "",
  interview_process: "",
  contact_email: "",
  status: "published",
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [view, setView] = useState<View>("jobs");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const user = session?.user ?? null;
  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void loadData(user);
  }, [user?.id]);

  async function loadData(currentUser: User | null = user) {
    setBusy(true);
    setNotice("");

    const { data: publicJobs, error: jobsError } = await supabase
      .from("job_listings")
      .select("*")
      .order("created_at", { ascending: false });

    if (jobsError) {
      setNotice(jobsError.message);
      setBusy(false);
      return;
    }

    setJobs((publicJobs ?? []) as JobListing[]);
    setSelectedJobId((current) => current ?? publicJobs?.[0]?.id ?? null);

    if (!currentUser) {
      setProfile(null);
      setApplications([]);
      setBusy(false);
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    setProfile((profileData as Profile | null) ?? null);

    const { data: applicationData, error: applicationsError } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (applicationsError) {
      setNotice(applicationsError.message);
    }

    setApplications((applicationData ?? []) as JobApplication[]);
    setBusy(false);
  }

  const seekerApplications = useMemo(() => {
    return applications.map((application) => ({
      ...application,
      job: jobs.find((job) => job.id === application.job_id),
    }));
  }, [applications, jobs]);

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Worklane</p>
            <h1 className="text-3xl font-semibold">Job board for focused hiring</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <button className={navClass(view === "jobs")} onClick={() => setView("jobs")}>
              Browse jobs
            </button>
            {profile?.role === "employer" && (
              <button className={navClass(view === "employer")} onClick={() => setView("employer")}>
                Employer overview
              </button>
            )}
            {profile?.role === "seeker" && (
              <button className={navClass(view === "seeker")} onClick={() => setView("seeker")}>
                My applications
              </button>
            )}
            {user ? (
              <button className="btn-secondary" onClick={() => supabase.auth.signOut()}>
                Sign out
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      {notice ? <div className="mx-auto mt-4 max-w-7xl px-5 text-sm font-medium text-rose-700">{notice}</div> : null}

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {view === "jobs" && (
            <JobBrowser
              jobs={jobs}
              selectedJob={selectedJob}
              onSelect={setSelectedJobId}
              user={user}
              profile={profile}
              onApplied={() => loadData()}
              setNotice={setNotice}
            />
          )}
          {view === "employer" && profile?.role === "employer" && (
            <EmployerOverview
              profile={profile}
              jobs={jobs.filter((job) => job.employer_id === profile.id)}
              applications={applications}
              onChanged={() => loadData()}
              setNotice={setNotice}
            />
          )}
          {view === "seeker" && profile?.role === "seeker" && (
            <SeekerOverview applications={seekerApplications} />
          )}
        </div>

        <aside className="space-y-5">
          {user && profile ? (
            <AccountPanel profile={profile} user={user} busy={busy} />
          ) : (
            <AuthPanel onDone={() => loadData()} />
          )}
          <StatsPanel jobs={jobs} applications={applications} profile={profile} />
        </aside>
      </section>
    </main>
  );
}

function AuthPanel({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [role, setRole] = useState<Role>("seeker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [headline, setHeadline] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setMessage(error?.message ?? "Signed in.");
      setLoading(false);
      onDone();
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      setMessage(error?.message ?? "Could not create account.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      role,
      full_name: fullName,
      company_name: role === "employer" ? companyName : null,
      headline: role === "seeker" ? headline : null,
    });

    setMessage(profileError?.message ?? "Account created.");
    setLoading(false);
    onDone();
  }

  return (
    <section className="panel">
      <div className="segmented">
        <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>
          Sign up
        </button>
        <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>
          Sign in
        </button>
      </div>
      <form className="mt-4 space-y-3" onSubmit={submit}>
        {mode === "signup" && (
          <div className="segmented">
            <button type="button" className={role === "seeker" ? "active" : ""} onClick={() => setRole("seeker")}>
              Job seeker
            </button>
            <button type="button" className={role === "employer" ? "active" : ""} onClick={() => setRole("employer")}>
              Employer
            </button>
          </div>
        )}
        {mode === "signup" && <Input label="Full name" value={fullName} onChange={setFullName} required />}
        {mode === "signup" && role === "employer" && (
          <Input label="Company name" value={companyName} onChange={setCompanyName} required />
        )}
        {mode === "signup" && role === "seeker" && (
          <Input label="Headline" value={headline} onChange={setHeadline} placeholder="Product designer, backend engineer..." />
        )}
        <Input label="Email" value={email} onChange={setEmail} type="email" required />
        <Input label="Password" value={password} onChange={setPassword} type="password" required minLength={6} />
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
        </button>
        {message && <p className="text-sm text-slate-600">{message}</p>}
      </form>
    </section>
  );
}

function JobBrowser({
  jobs,
  selectedJob,
  onSelect,
  user,
  profile,
  onApplied,
  setNotice,
}: {
  jobs: JobListing[];
  selectedJob: JobListing | null;
  onSelect: (id: number) => void;
  user: User | null;
  profile: Profile | null;
  onApplied: () => void;
  setNotice: (message: string) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <section className="space-y-3">
        {jobs.map((job) => (
          <button key={job.id} className={`job-card ${selectedJob?.id === job.id ? "selected" : ""}`} onClick={() => onSelect(job.id)}>
            <span className="text-xs font-semibold uppercase text-teal-700">{job.company_name}</span>
            <strong>{job.title}</strong>
            <span>{job.location} · {job.remote_type} · {job.employment_type}</span>
            <span>{formatSalary(job)}</span>
          </button>
        ))}
      </section>
      {selectedJob ? (
        <JobDetail job={selectedJob} user={user} profile={profile} onApplied={onApplied} setNotice={setNotice} />
      ) : (
        <section className="panel">No jobs are published yet.</section>
      )}
    </div>
  );
}

function JobDetail({
  job,
  user,
  profile,
  onApplied,
  setNotice,
}: {
  job: JobListing;
  user: User | null;
  profile: Profile | null;
  onApplied: () => void;
  setNotice: (message: string) => void;
}) {
  const [coverLetter, setCoverLetter] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [availability, setAvailability] = useState("Can start within 4 weeks");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [loading, setLoading] = useState(false);

  async function apply(event: FormEvent) {
    event.preventDefault();
    if (!user || !profile || profile.role !== "seeker") {
      setNotice("Sign up as a job seeker before applying.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("applications").insert({
      job_id: job.id,
      employer_id: job.employer_id,
      seeker_id: user.id,
      applicant_name: profile.full_name,
      applicant_email: user.email,
      cover_letter: coverLetter,
      portfolio_url: portfolioUrl || null,
      availability,
      expected_salary: expectedSalary ? Number(expectedSalary) : null,
    });
    setLoading(false);

    if (error) {
      const alreadyApplied = error.message.includes("duplicate") || error.message.includes("UNIQUE constraint");
      setNotice(alreadyApplied ? "You already applied to this job." : error.message);
      return;
    }

    setNotice("Application sent.");
    setCoverLetter("");
    setPortfolioUrl("");
    setExpectedSalary("");
    onApplied();
  }

  return (
    <article className="panel">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-teal-700">{job.company_name}</p>
          <h2 className="text-3xl font-semibold">{job.title}</h2>
          <p className="mt-2 text-slate-600">{job.location} · {job.remote_type} · {job.employment_type}</p>
        </div>
        <div className="badge">{formatSalary(job)}</div>
      </div>

      <p className="mt-5 text-lg text-slate-700">{job.summary}</p>
      <DetailBlock title="The offering" content={job.description} />
      <DetailList title="Responsibilities" content={job.responsibilities} />
      <DetailList title="Requirements" content={job.requirements} />
      <DetailList title="Benefits" content={job.benefits} />
      <DetailBlock title="Interview process" content={job.interview_process} />

      <form className="mt-6 space-y-3 border-t border-slate-200 pt-5" onSubmit={apply}>
        <h3 className="text-xl font-semibold">Apply</h3>
        {!user && <p className="text-sm text-slate-600">Create a job seeker account to apply.</p>}
        {profile?.role === "employer" && <p className="text-sm text-slate-600">Employer accounts can review applicants but cannot apply.</p>}
        <Textarea label="Cover letter" value={coverLetter} onChange={setCoverLetter} required disabled={profile?.role !== "seeker"} />
        <Input label="Portfolio or LinkedIn URL" value={portfolioUrl} onChange={setPortfolioUrl} disabled={profile?.role !== "seeker"} />
        <Input label="Availability" value={availability} onChange={setAvailability} disabled={profile?.role !== "seeker"} />
        <Input label="Expected salary" type="number" value={expectedSalary} onChange={setExpectedSalary} disabled={profile?.role !== "seeker"} />
        <button className="btn-primary" disabled={loading || profile?.role !== "seeker"}>
          {loading ? "Sending..." : "Send application"}
        </button>
      </form>
    </article>
  );
}

function EmployerOverview({
  profile,
  jobs,
  applications,
  onChanged,
  setNotice,
}: {
  profile: Profile;
  jobs: JobListing[];
  applications: JobApplication[];
  onChanged: () => void;
  setNotice: (message: string) => void;
}) {
  return (
    <div className="space-y-5">
      <ListingForm profile={profile} onChanged={onChanged} setNotice={setNotice} />
      <section className="panel">
        <h2 className="text-2xl font-semibold">Your listings</h2>
        <div className="mt-4 space-y-4">
          {jobs.map((job) => {
            const jobApplications = applicationsForJob(applications, job.id);
            return (
              <div key={job.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase text-teal-700">{job.status}</p>
                    <h3 className="text-xl font-semibold">{job.title}</h3>
                    <p className="text-sm text-slate-600">{job.location} · {jobApplications.length} applications</p>
                  </div>
                  <StatusSelect applicationStatus={null} job={job} onChanged={onChanged} setNotice={setNotice} />
                </div>
                <div className="mt-4 space-y-3">
                  {jobApplications.map((application) => (
                    <ApplicantRow key={application.id} application={application} onChanged={onChanged} setNotice={setNotice} />
                  ))}
                  {jobApplications.length === 0 && <p className="text-sm text-slate-500">No applicants yet.</p>}
                </div>
              </div>
            );
          })}
          {jobs.length === 0 && <p className="text-sm text-slate-500">Create your first listing to start collecting applicants.</p>}
        </div>
      </section>
    </div>
  );
}

function ListingForm({
  profile,
  onChanged,
  setNotice,
}: {
  profile: Profile;
  onChanged: () => void;
  setNotice: (message: string) => void;
}) {
  const [form, setForm] = useState(emptyListing);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof emptyListing, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("job_listings").insert({
      employer_id: profile.id,
      ...form,
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
    });
    setLoading(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    setNotice("Listing created.");
    setForm({ ...emptyListing, company_name: profile.company_name ?? "" });
    onChanged();
  }

  return (
    <section className="panel">
      <h2 className="text-2xl font-semibold">Create a job listing</h2>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submit}>
        <Input label="Job title" value={form.title} onChange={(value) => update("title", value)} required />
        <Input label="Company" value={form.company_name} onChange={(value) => update("company_name", value)} required />
        <Input label="Location" value={form.location} onChange={(value) => update("location", value)} required />
        <Select label="Work style" value={form.remote_type} onChange={(value) => update("remote_type", value)} options={["On-site", "Hybrid", "Remote"]} />
        <Select label="Employment type" value={form.employment_type} onChange={(value) => update("employment_type", value)} options={["Full-time", "Part-time", "Contract", "Internship"]} />
        <Select label="Status" value={form.status} onChange={(value) => update("status", value)} options={["published", "draft", "closed"]} />
        <Input label="Salary minimum" type="number" value={form.salary_min} onChange={(value) => update("salary_min", value)} />
        <Input label="Salary maximum" type="number" value={form.salary_max} onChange={(value) => update("salary_max", value)} />
        <Input label="Currency" value={form.currency} onChange={(value) => update("currency", value)} required />
        <Input label="Contact email" type="email" value={form.contact_email} onChange={(value) => update("contact_email", value)} required />
        <div className="md:col-span-2">
          <Textarea label="Short summary" value={form.summary} onChange={(value) => update("summary", value)} required />
        </div>
        <div className="md:col-span-2">
          <Textarea label="Offering details" value={form.description} onChange={(value) => update("description", value)} required />
        </div>
        <Textarea label="Responsibilities" value={form.responsibilities} onChange={(value) => update("responsibilities", value)} required />
        <Textarea label="Requirements" value={form.requirements} onChange={(value) => update("requirements", value)} required />
        <Textarea label="Benefits" value={form.benefits} onChange={(value) => update("benefits", value)} required />
        <Textarea label="Interview process" value={form.interview_process} onChange={(value) => update("interview_process", value)} required />
        <button className="btn-primary md:col-span-2" disabled={loading}>
          {loading ? "Creating..." : "Publish listing"}
        </button>
      </form>
    </section>
  );
}

function SeekerOverview({ applications }: { applications: Array<JobApplication & { job?: JobListing }> }) {
  return (
    <section className="panel">
      <h2 className="text-2xl font-semibold">Jobs you applied to</h2>
      <div className="mt-4 space-y-3">
        {applications.map((application) => (
          <div key={application.id} className="rounded-md border border-slate-200 p-4">
            <p className="text-sm font-semibold uppercase text-teal-700">{application.status}</p>
            <h3 className="text-xl font-semibold">{application.job?.title ?? "Listing unavailable"}</h3>
            <p className="text-sm text-slate-600">
              {application.job?.company_name ?? "Unknown company"} · Applied {new Date(application.created_at).toLocaleDateString()}
            </p>
            <p className="mt-3 text-slate-700">{application.cover_letter}</p>
          </div>
        ))}
        {applications.length === 0 && <p className="text-sm text-slate-500">Applications you submit will appear here.</p>}
      </div>
    </section>
  );
}

function ApplicantRow({
  application,
  onChanged,
  setNotice,
}: {
  application: JobApplication;
  onChanged: () => void;
  setNotice: (message: string) => void;
}) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="font-semibold">{application.applicant_name}</h4>
          <p className="text-sm text-slate-600">{application.applicant_email}</p>
          <p className="mt-2 text-sm text-slate-700">{application.cover_letter}</p>
          <p className="mt-2 text-sm text-slate-500">
            {application.availability}
            {application.expected_salary ? ` · Expected ${application.expected_salary}` : ""}
            {application.portfolio_url ? ` · ${application.portfolio_url}` : ""}
          </p>
        </div>
        <StatusSelect applicationStatus={application.status} application={application} onChanged={onChanged} setNotice={setNotice} />
      </div>
    </div>
  );
}

function StatusSelect({
  applicationStatus,
  application,
  job,
  onChanged,
  setNotice,
}: {
  applicationStatus: ApplicationStatus | null;
  application?: JobApplication;
  job?: JobListing;
  onChanged: () => void;
  setNotice: (message: string) => void;
}) {
  async function update(value: string) {
    const table = application ? "applications" : "job_listings";
    const { error } = await supabase.from(table).update({ status: value }).eq("id", application?.id ?? job?.id);
    if (error) {
      setNotice(error.message);
      return;
    }
    onChanged();
  }

  const options = applicationStatus ? ["submitted", "reviewing", "interview", "offer", "declined"] : ["published", "draft", "closed"];

  return <Select label="Status" value={applicationStatus ?? job?.status ?? "published"} onChange={update} options={options} compact />;
}

function AccountPanel({ profile, user, busy }: { profile: Profile; user: User; busy: boolean }) {
  return (
    <section className="panel">
      <p className="text-sm font-semibold uppercase text-teal-700">{profile.role}</p>
      <h2 className="text-2xl font-semibold">{profile.full_name}</h2>
      <p className="text-sm text-slate-600">{user.email}</p>
      {profile.company_name && <p className="mt-2 text-slate-700">{profile.company_name}</p>}
      {profile.headline && <p className="mt-2 text-slate-700">{profile.headline}</p>}
      {busy && <p className="mt-3 text-sm text-slate-500">Refreshing...</p>}
    </section>
  );
}

function StatsPanel({ jobs, applications, profile }: { jobs: JobListing[]; applications: JobApplication[]; profile: Profile | null }) {
  return (
    <section className="panel">
      <h2 className="text-xl font-semibold">Board snapshot</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Open roles" value={jobs.filter((job) => job.status === "published").length} />
        <Stat label="Applications" value={applications.length} />
        <Stat label="Drafts" value={profile?.role === "employer" ? jobs.filter((job) => job.status === "draft").length : 0} />
        <Stat label="Closed" value={jobs.filter((job) => job.status === "closed").length} />
      </div>
    </section>
  );
}

function DetailBlock({ title, content }: { title: string; content: string }) {
  return (
    <section className="mt-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 whitespace-pre-line text-slate-700">{content}</p>
    </section>
  );
}

function DetailList({ title, content }: { title: string; content: string }) {
  return (
    <section className="mt-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
        {splitLines(content).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-100 p-3">
      <strong className="text-2xl">{value}</strong>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  placeholder,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  minLength?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        minLength={minLength}
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} required={required} disabled={disabled} rows={4} />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  compact?: boolean;
}) {
  return (
    <label className={`field ${compact ? "min-w-36" : ""}`}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function navClass(active: boolean) {
  return active ? "btn-primary" : "btn-secondary";
}

export default App;
