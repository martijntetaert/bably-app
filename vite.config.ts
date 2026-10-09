/// <reference types="vitest" />

import { tailwindReferencePlugin } from '@libaro-io/libaro-utilities';
import tailwindcss from '@tailwindcss/vite';
import legacy from '@vitejs/plugin-legacy';
import vue from '@vitejs/plugin-vue';
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

export default defineConfig({
    // Registering for pushes without the Firebase config crashes the app natively, so the
    // build only offers pushes when android/app/google-services.json is there.
    define: {
        __HAS_FIREBASE__: JSON.stringify(fs.existsSync(path.resolve(__dirname, 'android/app/google-services.json'))),
    },
    plugins: [tailwindReferencePlugin() as unknown as Plugin, tailwindcss(), vue(), legacy()],
    resolve: {
        alias: {
            '@css': path.resolve(__dirname, './src/css'),
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
    },
});
