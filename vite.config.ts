import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8081,
    host: true,
    allowedHosts: ['jtattersall09403-vscode-tunnel.tools.analytical-platform.service.justice.gov.uk']
  }
})
