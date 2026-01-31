import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/apis': path.resolve(__dirname, './src/apis'),
      '@/auth': path.resolve(__dirname, './src/auth'),
      '@/config': path.resolve(__dirname, './src/config'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/libs': path.resolve(__dirname, './src/libs'),
      '@/models': path.resolve(__dirname, './src/models'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/state': path.resolve(__dirname, './src/state'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@/utilities': path.resolve(__dirname, './src/utilities'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/utilities/test-setup.ts',
  },
})
