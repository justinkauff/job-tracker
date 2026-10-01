import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The API runs on port 3000 (npm run dev or Docker) and this dev server on 5173.
// Browsers block calls to a different port (CORS), so the dev server forwards
// API requests to port 3000. To the browser, everything comes from one address.
const api = 'http://localhost:3000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/applications': api,
      '/contacts': api,
      '/import': api,
      '/health': api,
    },
  },
})
