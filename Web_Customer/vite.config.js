import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin()],
    server: {
        port: 62652,
        proxy: {
            '/api/Auth': {
                target: 'http://localhost:5002',
                changeOrigin: true,
            },
            '/api': {
                target: 'http://localhost:5001',
                changeOrigin: true,
            },
        },
    }
})
