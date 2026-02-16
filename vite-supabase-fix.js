// This plugin handles Supabase functions in Vite
const supabaseFix = () => ({
  name: 'supabase-fix',
  config: () => ({
    optimizeDeps: {
      exclude: ['supabase'],
    },
    ssr: {
      noExternal: true,
    },
  }),
  resolveId(source) {
    if (source.includes('supabase/functions')) {
      // Return a virtual module for Supabase functions
      return { id: 'virtual:supabase-functions', external: true };
    }
    return null;
  },
  load(id) {
    if (id === 'virtual:supabase-functions') {
      // Return an empty module for Supabase functions
      return 'export default {};';
    }
    return null;
  },
});

export default supabaseFix;
