import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy, options) => {
          // Handle API calls in development
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (req.url === '/api/process-table') {
              // Mock response for development
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                tableData: {
                  headers: ['Date', 'Shift', 'Coal Type', 'Quantity (tons)', 'Location', 'Quality Grade'],
                  rows: [
                    ['2024-01-15', 'Day', 'Bituminous', '250', 'Pit A', 'Grade 1'],
                    ['2024-01-15', 'Night', 'Anthracite', '180', 'Pit B', 'Grade 2'],
                    ['2024-01-16', 'Day', 'Bituminous', '320', 'Pit A', 'Grade 1']
                  ]
                }
              }));
              return false;
            }
            if (req.url === '/api/save-to-database') {
              // Mock database save
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
              return false;
            }
          });
        }
      }
    }
  }
});