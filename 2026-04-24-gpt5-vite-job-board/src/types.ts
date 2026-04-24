export type Role = "employer" | "seeker";
export type ListingStatus = "draft" | "published" | "closed";
export type ApplicationStatus = "submitted" | "reviewing" | "interview" | "offer" | "declined";

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  company_name: string | null;
  headline: string | null;
  created_at: string;
};

export type JobListing = {
  id: number;
  employer_id: string;
  title: string;
  company_name: string;
  location: string;
  remote_type: string;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  summary: string;
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  interview_process: string;
  contact_email: string;
  status: ListingStatus;
  created_at: string;
};

export type JobApplication = {
  id: number;
  job_id: number;
  employer_id: string | null;
  seeker_id: string;
  applicant_name: string;
  applicant_email: string;
  cover_letter: string;
  portfolio_url: string | null;
  availability: string;
  expected_salary: number | null;
  status: ApplicationStatus;
  created_at: string;
};

export type ApplicationWithJob = JobApplication & {
  job?: JobListing;
};
