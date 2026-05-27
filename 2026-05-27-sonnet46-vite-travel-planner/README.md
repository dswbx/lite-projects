# Travel Planner

Plan your trips in one place. Create trips with destinations and dates, map out each day's activities, jot down notes, and keep a packing checklist. Your data is private -- each account only sees its own trips.

---

## How to open it

You'll need **Bun** to run this app. If you don't have it:

1. Install Bun: visit [https://bun.sh](https://bun.sh) and follow the one-line install for your system.

Then, in your terminal, run these commands one at a time:

```
bun install
bun run dev
```

Open your browser and go to **http://localhost:5178**

(If port 5178 is already in use, Vite will pick the next free port and tell you in the terminal.)

---

## How to use it

### 1. Create an account

When you first open the app, you'll see a sign-in screen. Click **Sign Up** to create a new account with your email and a password (at least 6 characters). After signing up you're taken straight to your trips.

### 2. Create a trip

Click **New Trip**. Fill in:
- **Trip name** -- give it a memorable title, like "Summer in Japan"
- **Destination** -- the city or country you're visiting
- **Start date** and **End date**
- **Notes** (optional) -- anything general about the trip

Click **Create Trip**. Your trip appears as a card on the home screen.

### 3. Plan your itinerary

Click on any trip card to open it. You'll land on the **Itinerary** tab, which shows one section per day of your trip.

For each day:
- Click the notes area to type a note (click away to save automatically)
- Click **Add activity** to log something you want to do. You can pick a time of day (Morning, Afternoon, Evening, Night, All day) and add a description like an address or booking number.
- Hover over any activity and click the X to remove it.

### 4. Manage your packing list

Click the **Packing** tab at the top of a trip. You'll see a checklist and a progress bar.

- Click **Add packing item**, type the name, pick a category, and click **Add item**.
- Tap the checkbox next to any item to mark it as packed (it gets a strikethrough).
- Use the **All / Unpacked / Packed** filter to focus on what's left.
- Hover over an item and click X to delete it.

### 5. Delete a trip

On the home screen, hover over a trip card and click the trash icon in the top-right corner of the card. You'll be asked to confirm.

---

## Where is my data stored?

Everything is stored locally on your computer in a small database file inside the project folder (`supabase/.temp/data.db`). Nothing is sent to any server. If you delete the project folder, your data is gone too.

---

## Troubleshooting

**Port already in use** -- If you see a message about port 5178 being in use, Vite will automatically pick the next available port (like 5179). Just open that URL instead.

**"bun: command not found"** -- Bun isn't installed. Go to [https://bun.sh](https://bun.sh) and follow the install steps.

**White screen or no data** -- Try refreshing the page. If the issue persists, stop the server (Ctrl+C) and run `bun run dev` again.

---

## Optional: production build

```
bun run build
```

This creates an optimized `dist/` folder. Open `dist/index.html` in a browser (note: a local server is still needed for the database to work, so this is mostly useful for static hosting setups).

---

**Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4 + @supabase/lite (SQLite, local-only)
