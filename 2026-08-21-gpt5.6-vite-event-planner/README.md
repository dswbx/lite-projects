# Gather — Event Planner

Gather is a private, simple place to plan your get-togethers. Create an event, add the people you want to invite, and keep track of who is coming. Your plans are only visible to you.

## How to open it

1. Install [Bun](https://bun.sh) if you do not have it. This project was created with npm because Bun was unavailable in this run, so npm works too.
2. In a terminal, open this project folder.
3. Run `npm install` (or `bun install` if you prefer Bun).
4. Run `npm run dev`.
5. Open the address shown in the terminal, normally `http://localhost:5173`.

## How to use it

1. Create an account with your email address and a password of at least six characters. This opens your own private planner.
2. Fill in an event name, date, and location, then choose **Add to calendar**.
3. Under an event, type a guest's name (and optionally their email) and select **Add guest**.
4. Use the RSVP menu beside each guest to mark them as going, maybe, declined, or still pending.
5. Choose **Edit** to change an event, or **Delete** to remove it and its guest list.

Events are always shown with the nearest date first. Your data is stored in the local database used by this app; database rules ensure signed-in people can only read and change their own events and guests.

## Troubleshooting

- If the page does not open, check the terminal for the exact address; another app may already be using port 5173.
- If `npm` is missing, install Node.js first, then repeat the steps above.
- To check the production version of the app, run `npm run build`.

Built with Vite, React, TypeScript, Tailwind CSS, and Supabase Lite.
