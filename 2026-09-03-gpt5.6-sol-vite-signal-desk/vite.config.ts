import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { supalite } from '@supabase/lite/vite'
import path from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const usesExternalSupabase = Boolean(process.env.VITE_SUPABASE_URL)
  const usesEmbeddedSupalite = !usesExternalSupabase && mode !== 'test'

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(usesEmbeddedSupalite
        ? [
            supalite({
              admin: false,
              prefixes: ['/auth/v1', '/rest/v1', '/storage/v1', '/_system'],
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})
