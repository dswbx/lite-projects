import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { supalite } from 'lite-supa/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), supalite()],
  server: {
    port: 5173,
  },
})
