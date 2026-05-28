import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { supalite } from 'lite-supa/vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), supalite(), tailwindcss()],
})
