import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import supalite from "@supabase/lite/vite";

export default defineConfig(() => {
  // When pointed at an external Supabase (e.g. after `lite upgrade`), skip the
  // embedded supalite API so it doesn't bind the port or read a config.toml the
  // upgrade has rewritten. Unset = normal local supalite dev.
  const useExternalSupabase = Boolean(process.env.VITE_SUPABASE_URL);
  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(useExternalSupabase ? [] : [supalite()]),
    ],
  };
});
