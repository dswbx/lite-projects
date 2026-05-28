import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import lite from '@supabase/lite/vite'

export default defineConfig({
  plugins: [react(), lite()],
})
