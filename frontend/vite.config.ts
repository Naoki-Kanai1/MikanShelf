import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // コンテナ外 (ホストのブラウザ) からアクセスできるよう 0.0.0.0 で待ち受ける
    host: true,
    port: 5173,
    strictPort: true,
    // Windows 側のファイルシステムをマウントしているなど、ファイル変更が検知されない場合は
    // VITE_USE_POLLING=true を設定する
    watch: {
      usePolling: process.env.VITE_USE_POLLING === 'true',
    },
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
