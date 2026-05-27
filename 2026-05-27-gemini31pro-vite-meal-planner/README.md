# Weekly Meal Planner

A simple app to help you plan your meals for the week and automatically generate a shopping list.

## What it is

This app lets you save your favorite meals along with their ingredients. You can then assign these meals to different days of the week. When you're ready to go to the store, just click a button to get a combined shopping list of all the ingredients you need for the week's meals.

## How to open it

1. Make sure you have [Bun](https://bun.sh/) installed on your computer.
2. Open your terminal and run these commands:

```bash
bun install
bun dev
```

3. Open your web browser and go to `http://localhost:5174` (or whichever URL the terminal shows).

## How to use it

1. **Sign Up**: When you first open the app, enter an email and password to create an account. You don't need a real email; any text with an `@` symbol will work for now.
2. **Add Meals**: On the right side, click the `+` button to add a new meal. Give it a name and list the ingredients you need for it.
3. **Plan Your Week**: On the left side, you'll see the days of the week. Use the dropdown menus to assign your saved meals to specific days.
4. **Get Your Shopping List**: Click the "Shopping List" button at the top. The app will look at all the meals you've planned for the week and combine their ingredients into one easy-to-read list.

## Troubleshooting

- **Port already in use**: If the app doesn't start because the port is in use, the terminal will usually try another port automatically (like `5174` instead of `5173`). Just look at the terminal output to see which URL to open.
- **Can't sign in**: Make sure you click "Don't have an account? Sign up" the very first time you use the app to create your account.

---
*Built with React, Vite, Tailwind CSS, and Supabase Lite.*
