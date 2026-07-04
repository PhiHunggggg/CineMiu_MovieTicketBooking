import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3001,
    strictPort: false, // tự động thử port khác nếu 3001 đang bị chiếm
    open: true,        // tự mở browser khi chạy npm run dev
    proxy: {
      '/api': {
        // 🔴 KHI DEBUG DEMO: đổi thành 'http://localhost:5001' để bypass Gateway (tránh 503 timeout)
        // ✅ KHI BÌNH THƯỜNG: giữ 'http://localhost:5000' (qua API Gateway)
        target: 'http://localhost:5000', // ← ĐÃ ĐỔI SANG DIRECT CHO DEMO DEBUG
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.log('[Proxy Error]', err.message);
            if (!res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'Backend unavailable. Ensure API Gateway is running on port 5000.' }));
            }
          });
        }
      }
    }
  }
})
