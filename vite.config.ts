import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
  server: {
    proxy: {
      '/api/': {
        target: 'http://battery-ml-alb-1652817744.us-east-1.elb.amazonaws.com',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
})