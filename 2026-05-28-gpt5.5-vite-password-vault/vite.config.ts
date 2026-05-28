import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { supalite } from "@supabase/lite/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    supalite({
      config: "./supabase/config.toml",
    }),
  ],
});
