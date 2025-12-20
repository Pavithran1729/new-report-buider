import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createRequire } from 'module';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from .env files
  const env = loadEnv(mode, process.cwd(), '');

  // Create a custom require function to handle module resolution
  const require = createRequire(import.meta.url);
  
  // This will prevent Vite from trying to process Supabase functions
  const originalResolve = require.resolve;
  require.resolve = (id: string, options: any) => {
    if (id.includes('supabase/functions')) {
      return ''; // Return empty string for Supabase functions to skip them
    }
    return originalResolve(id, options);
  };

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      'process.env': env,
    },
    optimizeDeps: {
      exclude: ['**/supabase/functions/**'],
    },
    build: {
      rollupOptions: {
        external: (id: string) => {
          // Explicitly exclude any Supabase functions from the bundle
          return id.includes('supabase/functions');
        },
      },
    },
  };
});
