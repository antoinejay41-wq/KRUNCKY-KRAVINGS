import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_WHATSAPP_NUMBER': JSON.stringify(
        (() => {
          const raw =
            process.env.VITE_WHATSAPP_NUMBER ||
            process.env.Whatsappnumber ||
            process.env.WHATSAPPNUMBER ||
            process.env.WHATSAPP_NUMBER ||
            '18293252827';
          let digits = String(raw).replace(/\D/g, '');
          if (digits.length === 10) {
            digits = '1' + digits;
          }
          return digits || '18293252827';
        })()
      ),
      'import.meta.env.VITE_CASHAPP_URL': JSON.stringify(
        process.env.VITE_CASHAPP_URL ||
        process.env.Cashapp ||
        process.env.CASHAPP ||
        'https://cash.app/$11en11en'
      ),
      'import.meta.env.VITE_ZELLE_INFO': JSON.stringify(
        process.env.VITE_ZELLE_INFO ||
        process.env.Zelle ||
        process.env.ZELLE ||
        'viztunellc@gmail.com'
      ),
      'import.meta.env.VITE_APPLEPAY_INFO': JSON.stringify(
        process.env.VITE_APPLEPAY_INFO ||
        process.env.Applapay ||
        process.env.APPLEPAY ||
        process.env.APPLE_PAY ||
        '19432049964'
      ),
      'import.meta.env.VITE_ADMIN_EMAIL': JSON.stringify(
        process.env.VITE_ADMIN_EMAIL ||
        process.env.ADMIN_EMAIL ||
        'antoinejay41@gmail.com'
      ),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
