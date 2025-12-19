import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { session, token, violations } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const sessionData = {
      driverName: token.child_name,
      status: session.status,
      startTime: session.start_time,
      endTime: session.end_time,
      duration: session.start_time && session.end_time 
        ? Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000)
        : null,
      maxSpeed: session.max_speed_reached,
      speedLimit: token.speed_limit,
      distance: session.current_distance_km,
      distanceLimit: token.distance_limit_km,
      totalViolations: session.total_violations,
      violations: violations || []
    };

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
            content: `You are a driving session analyst. Generate a VERY brief summary (2-3 sentences max) of a driving session. Be concise and focus on:
1. Overall assessment (safe/concerning)
2. Key violations if any
3. Notable stats

Keep it parent-friendly and easy to glance at. Use emojis sparingly for status indicators.`
          },
          {
            role: "user",
            content: `Summarize this driving session:\n${JSON.stringify(sessionData, null, 2)}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "Unable to generate summary";

    return new Response(JSON.stringify({ summary }), {
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
