import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!
    );
    const {
      data: { user },
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { searchTerm } = await req.json();
    if (
      !searchTerm ||
      typeof searchTerm !== "string" ||
      searchTerm.trim().length < 2 ||
      searchTerm.trim().length > 50
    ) {
      return new Response(
        JSON.stringify({ error: "Search term must be 2-50 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const sanitized = searchTerm.trim();

    // Find matching profiles (excluding the caller), limited to 10
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .ilike("display_name", `%${sanitized}%`)
      .neq("user_id", user.id)
      .limit(10);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ profile: null, city: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find exact match first, then first partial
    const exact = profiles.find(
      (p) => p.display_name.toLowerCase() === sanitized.toLowerCase()
    );
    const match = exact || profiles[0];

    // Get their city
    const { data: city } = await supabase
      .from("cities")
      .select("id")
      .eq("user_id", match.user_id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        profile: { user_id: match.user_id, display_name: match.display_name },
        city: city ? { id: city.id } : null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
