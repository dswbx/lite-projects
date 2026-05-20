import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import supalite from "@supabase/lite/vite";

export default defineConfig({
  plugins: [
    react(),
    supalite({
      migrateOnBoot: true,
      watchSchema: true,
    }),
  ],
});
