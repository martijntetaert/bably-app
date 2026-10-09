/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  // Registering for pushes without the Firebase config crashes the app natively, so the
  // build only offers pushes when android/app/google-services.json is there.
  define: {
    __HAS_FIREBASE__: JSON.stringify(fs.existsSync(path.resolve(__dirname, 'android/app/google-services.json'))),
  },
  plugins: [
    vue(),
    legacy()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
