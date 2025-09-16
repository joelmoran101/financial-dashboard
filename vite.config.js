import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: false,
    cors: true
  },
  build: {
    // Security optimizations
    minify: true,
    sourcemap: false, // Don't expose source maps in production
    rollupOptions: {
      output: {
        // Obfuscate chunk names
        entryFileNames: '[name].[hash].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[hash].[ext]'
      }
    }
  },
  // Prevent access to sensitive files
  publicDir: 'public'
})
