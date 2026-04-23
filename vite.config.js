import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/skips-counter/',   // Must match your GitHub repo name exactly
  build: {
    outDir: 'dist',
    sourcemap: false,         // No sourcemaps in production — don't expose code structure
    rollupOptions: {
      output: {
        // Rolldown (Vite 8) requires manualChunks as a function, not a plain object.
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor'
          }
          if (id.includes('node_modules/@react-oauth')) {
            return 'google'
          }
        },
      },
    },
  },
})
