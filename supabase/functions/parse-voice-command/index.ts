import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://ebxdpbniegwtwnkisbkh.lovableproject.com",
  "https://lovable.dev",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && (allowedOrigins.includes(origin) || origin.endsWith(".lovable.app"));
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { transcript } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a voice command parser for a driving permission system. Extract driving token parameters from voice commands.

Extract these parameters (use defaults if not mentioned):
- childName: string (required - the driver's name)
- speedLimit: number (20-120 km/h, default 60)
- timeLimit: number (10-180 minutes, default 30)
- distanceLimit: number (1-50 km, default 10)
- geofenceRadius: number (1-20 km, default 5)

Return ONLY valid JSON with these fields. If you cannot understand the command, return {"error": "Could not understand command"}.

Examples:
"Create token for John with 80 speed limit" -> {"childName":"John","speedLimit":80,"timeLimit":30,"distanceLimit":10,"geofenceRadius":5}
"Allow Sarah to drive for 1 hour max 50 km per hour" -> {"childName":"Sarah","speedLimit":50,"timeLimit":60,"distanceLimit":10,"geofenceRadius":5}
"Token for Mike, 45 minutes, 20 km range" -> {"childName":"Mike","speedLimit":60,"timeLimit":45,"distanceLimit":20,"geofenceRadius":5}`
          },
          { role: "user", content: transcript }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_driving_token",
              description: "Create a driving token with parsed parameters",
              parameters: {
                type: "object",
                properties: {
                  childName: { type: "string", description: "Name of the driver" },
                  speedLimit: { type: "number", description: "Speed limit in km/h (20-120)" },
                  timeLimit: { type: "number", description: "Time limit in minutes (10-180)" },
                  distanceLimit: { type: "number", description: "Distance limit in km (1-50)" },
                  geofenceRadius: { type: "number", description: "Geofence radius in km (1-20)" },
                  error: { type: "string", description: "Error message if command not understood" }
                },
                required: ["childName"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_driving_token" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Could not parse command" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
