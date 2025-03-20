import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // or whatever port your backend runs on
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
    host: true
  }
})
