import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  main: {
    entry: 'src/main/index.ts',
    build: {
      rollupOptions: {
        external: [
          'node-llama-cpp',
          /^@node-llama-cpp\//,
          '@nut-tree/nut-js',
          '@nut-tree/libnut',
          '@nut-tree/default-clipboard-provider',
          /^@nut-tree\/libnut/,
        ],
      },
    },
  },
  preload: {
    input: {
      index: path.join(__dirname, 'src/preload/index.ts'),
    },
  },
  renderer: {
    input: path.join(__dirname, 'src/renderer/index.html'),
    plugins: [react()],
    resolve: {
      alias: {
        '@renderer': path.join(__dirname, 'src/renderer'),
        react: path.join(__dirname, '../../node_modules/react'),
        'react-dom': path.join(__dirname, '../../node_modules/react-dom'),
      },
    },
  },
});
