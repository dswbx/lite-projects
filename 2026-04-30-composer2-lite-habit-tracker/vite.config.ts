import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { supalite } from '@supabase/lite/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), supalite()],
  server: {
    port: 5173,
  },
})
