import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

import { deepseekDevApi } from './vite-plugin-deepseek-dev';

export default defineConfig(({ mode }) => ({
  plugins: [react(), deepseekDevApi(mode)],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
}));
