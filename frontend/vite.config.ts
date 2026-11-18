import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Plugin to automatically redirect bare root/paths (like / or /settings) to /itcrm/... during local dev
function devBaseRedirectPlugin(): Plugin {
  return {
    name: 'dev-base-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        // If request is already on /itcrm or is an internal vite/asset/api path, pass through
        if (
          url.startsWith('/itcrm') ||
          url.startsWith('/@') ||
          url.startsWith('/node_modules') ||
          url.startsWith('/src') ||
          url.startsWith('/api') ||
          url.startsWith('/itcrmapi') ||
          url.includes('.')
        ) {
          return next();
        }

        // Redirect bare paths (e.g. /settings -> /itcrm/settings)
        const cleanPath = url.startsWith('/') ? url : `/${url}`;
        const target = `/itcrm${cleanPath === '/' ? '/' : cleanPath}`;
        res.writeHead(302, { Location: target });
        res.end();
      });
    },
  };
}

export default defineConfig({
  base: '/itcrm/',
  plugins: [react(), devBaseRedirectPlugin()],

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
