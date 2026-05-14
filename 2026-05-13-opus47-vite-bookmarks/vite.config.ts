import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { supalite } from "lite-supa/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // `lite migration up` (npm script) applies versioned migration files.
    // supalite still does its boot pass so it re-parses our DDL for RLS metadata
    // (otherwise the running server has no policies and RLS is bypassed).
    // schema_paths in config.toml points to the same migrations dir so the
    // declarative diff is a no-op.
    supalite({ watchSchema: false }),
  ],
});
