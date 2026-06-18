import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: '/dashboard/',
  plugins: [vue()],
  server: {
    proxy: {
      '/fonts-cdn': {
        target: 'https://cdn.qwq.lu',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/fonts-cdn/, '/fonts')
      }
    }
  }
})
