import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { supalite } from "lite-supa/vite";

export default defineConfig({
  plugins: [
    supalite(),
    react(),
    tailwindcss(),
  ],
});
