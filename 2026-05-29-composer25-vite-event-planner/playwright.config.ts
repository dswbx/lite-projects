import { defineConfig, devices } from "@playwright/test";

// One config, two backends. By default the Vite dev server runs the embedded
// supalite API (same-origin). Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in
// the environment to run the exact same suite against full Supabase (e.g. after
// `lite upgrade --target local`) — those vars are inherited by the webServer.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
