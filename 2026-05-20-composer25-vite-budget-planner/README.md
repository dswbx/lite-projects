# Monthly Budget Planner

This app helps you plan how much you want to spend each month, then track what you actually spend. You create categories (like Groceries or Rent), set a budget for each one, log expenses, and see a simple chart of budget vs. spending for the current month. Only you can see your numbers.

Your data is stored on your computer while you use the app (not sent to a cloud service).

## What you need first

Install **Bun**, a small tool that runs the app. If you do not have it yet:

1. Open https://bun.sh in your browser.
2. Follow the install steps for your computer (Mac, Windows, or Linux).
3. Close and reopen your terminal after installing.

## How to open the app

Copy and paste these commands one at a time in a terminal. Stay in this project folder.

```bash
bun install
bun dev
```

When it starts, the terminal shows a link, usually **http://localhost:5173**. Click it or paste it into your browser.

## How to use it

1. **Create an account** — enter your email and a password (at least 6 characters), then sign up or sign in.
2. **Add categories** — type a name (for example "Groceries") and click Add. Repeat for each type of spending you care about.
3. **Set monthly budgets** — pick a category, enter how much you want to spend this month, and click Save budget.
4. **Log expenses** — pick a category, enter the amount and date (and an optional note), then click Add expense.
5. **Check your progress** — at the top, the dashboard shows how much you have spent compared to your budget for each category and in total. Green bars mean you are within budget; red means you have gone over.

To leave, close the browser tab. To sign out, use the Sign out button.

## If something goes wrong

**"Port already in use" or the link does not open**

Another program may be using port 5173. Stop other dev servers, or close the other terminal window running a similar app, then run `bun dev` again.

**Blank page or errors after updating the app**

Stop the server (Ctrl+C in the terminal), then run:

```bash
bunx lite migration diff --execute --force
bun dev
```

**Tables or categories missing**

Same as above — the second command updates the local database schema.

## Built with

React, Vite, and Supabase Lite (local database and login on your machine).
