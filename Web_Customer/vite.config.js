import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin()],
    server: {
        port: 5173,
        proxy: {
            '/api/auth': {
                target: 'http://localhost:5002',
                changeOrigin: true,
                secure: false,
            },
            '/api': {
                target: 'http://localhost:5001',
                changeOrigin: true,
                secure: false,
            },
        },
    }
})
