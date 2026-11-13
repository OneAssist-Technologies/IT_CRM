import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/itcrm/',
  plugins: [react()],

  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
      },
      '/itcrmapi': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/itcrmapi/, ''),
      },
    },
  },

  preview: {
    allowedHosts: [
      'oneassist.net.in',
      'www.oneassist.net.in',
    ],
  },
})
