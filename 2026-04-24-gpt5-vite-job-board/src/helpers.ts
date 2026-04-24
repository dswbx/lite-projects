import type { JobApplication, JobListing } from "./types";

export function formatSalary(job: Pick<JobListing, "salary_min" | "salary_max" | "currency">) {
  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: job.currency || "USD",
    maximumFractionDigits: 0,
  });

  if (job.salary_min && job.salary_max) {
    return `${formatter.format(job.salary_min)} - ${formatter.format(job.salary_max)}`;
  }

  if (job.salary_min) {
    return `From ${formatter.format(job.salary_min)}`;
  }

  if (job.salary_max) {
    return `Up to ${formatter.format(job.salary_max)}`;
  }

  return "Salary not listed";
}

export function splitLines(value: string) {
  return value
    .split(/\n|\|/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function applicationsForJob(applications: JobApplication[], jobId: number) {
  return applications.filter((application) => application.job_id === jobId);
}
