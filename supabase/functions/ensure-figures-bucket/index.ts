import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";

// Small helper to read env and create admin client once
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!supabaseAdmin) {
    return new Response(
      JSON.stringify({ error: "Server is not configured with admin Supabase credentials." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    console.log("Checking existence of 'figures' storage bucket …");

    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) throw listError;

    const exists = buckets?.some((b: any) => b.id === "figures");

    if (!exists) {
      console.log("'figures' bucket not found. Creating …");
      const { error: createError } = await supabaseAdmin.storage.createBucket("figures", {
        public: true,
        fileSizeLimit: 10485760, // 10 MB
        allowedMimeTypes: [
          "image/png",
          "image/jpeg",
          "image/gif",
          "image/webp",
          "image/svg+xml",
        ],
      });
      if (createError) throw createError;
      console.log("'figures' bucket created successfully.");
    } else {
      console.log("'figures' bucket already exists – skipping creation.");
    }

    return new Response(
      JSON.stringify({ created: !exists }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error ensuring 'figures' bucket:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
