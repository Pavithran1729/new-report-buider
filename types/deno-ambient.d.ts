// Ambient declarations so the TypeScript language server stops reporting errors
// for Supabase Edge / Deno functions when editing in a Node-based workspace.

// Allow importing any remote module via https URL (e.g. deno.land, esm.sh)
// The actual types are provided by Deno at runtime; we approximate with `any`.
declare module "https://*" {
  const anyExport: any;
  export = anyExport;
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  [key: string]: any;
};
