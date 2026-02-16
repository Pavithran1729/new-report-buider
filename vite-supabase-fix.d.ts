// This is a type declaration for the vite-supabase-fix.js module
declare module './vite-supabase-fix.js' {
  import { Plugin } from 'vite';
  const supabaseFix: () => Plugin;
  export default supabaseFix;
}
