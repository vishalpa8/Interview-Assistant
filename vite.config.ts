import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Ensure we use the correct port
    strictPort: true, // Fail if port is already in use
  },
  build: {
    outDir: 'dist',
  },
})