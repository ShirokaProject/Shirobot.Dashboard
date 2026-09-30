import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  // Served by Shirobot under /dashboard/; the Pages build overrides it with the repo sub-path
  base: process.env.VITE_BASE ?? '/dashboard/',
  plugins: [vue()],
  server: {
    allowedHosts: ['devdash.oeo.one']
  },
  define: {
    __DASHBOARD_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'INVALID_ANNOTATION') return
        warn(warning)
      }
    }
  }
})
