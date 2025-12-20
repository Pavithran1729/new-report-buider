import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from 'url';
// @ts-ignore - We have the type declaration in vite-supabase-fix.d.ts
import supabaseFix from './vite-supabase-fix.js';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from .env files
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      supabaseFix(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // Redirect any supabase/functions imports to a virtual module
        'supabase/functions': 'virtual:supabase-functions',
      },
    },
    define: {
      'process.env': env,
    },
    build: {
      rollupOptions: {
        external: ['supabase/functions'],
        plugins: [
          {
            name: 'ignore-supabase-functions',
            resolveId(source) {
              if (source.includes('supabase/functions')) {
                return { id: 'virtual:supabase-functions', external: true };
              }
              return null;
            },
            load(id) {
              if (id === 'virtual:supabase-functions') {
                return 'export default {};';
              }
              return null;
            },
          },
        ],
      },
    },
  };
});
