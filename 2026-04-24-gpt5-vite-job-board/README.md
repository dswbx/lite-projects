# Worklane Job Board

Worklane is a small job board where employers can post detailed jobs and review applicants. Job seekers can browse open roles right away, then create an account when they are ready to apply.

## How To Open It

1. Install Bun from [https://bun.sh](https://bun.sh) if it is not already installed.
2. Open a terminal in this folder.
3. Run:

```bash
bun install
bun dev
```

4. Open the URL shown in the terminal, usually [http://localhost:5173](http://localhost:5173).

## How To Use It

The first screen shows published jobs. Click any job to read the full offer, including salary range, responsibilities, requirements, benefits, and interview steps.

To apply, create a job seeker account in the panel on the right. After signing up, fill in the application form on a job and send it. Your applications appear under "My applications".

Employers should create an employer account. After signing up, open "Employer overview" to create listings, switch listings between draft, published, and closed, and review people who applied. Employers can also move applications through review, interview, offer, or declined.

Data is stored by the local Supabase Lite server that runs inside Vite while `bun dev` is running. It stays on your computer in the local project database.

## Troubleshooting

If the page does not open, check that `bun dev` is still running and use the exact URL printed in the terminal.

If port 5173 is already in use, Vite will print a different local URL. Open that URL instead.

If you want to reset all local data, stop the server and delete `supabase/.temp/data.db`, then run `bun dev` again.

## Optional Build

To create a production build, run:

```bash
bun run build
```

Built with React, Vite, Tailwind, Bun, and Supabase Lite.
