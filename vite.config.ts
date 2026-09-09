import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import compression from 'vite-plugin-compression';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      // Pre-compress all assets with Gzip for web servers & GitHub Pages CDN
      compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 256,
        deleteOriginFile: false,
      }),
      // Pre-compress all assets with Brotli for modern browsers
      compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 256,
        deleteOriginFile: false,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
          passes: 3,
          unsafe: true,
          unsafe_math: true,
        },
        mangle: {
          toplevel: true,
        },
        format: {
          comments: false,
        },
      },
      cssMinify: true,
      reportCompressedSize: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('d3-delaunay')) {
                return 'vendor-d3';
              }
              return 'vendor';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
