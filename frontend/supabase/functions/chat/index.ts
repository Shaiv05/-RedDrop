import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const REDDROP_API_KEY = Deno.env.get("REDDROP_API_KEY");
    
    if (!REDDROP_API_KEY) {
      throw new Error("REDDROP_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.reddrop.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REDDROP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are RedDrop Assistant, a helpful and trustworthy AI for a blood donation platform.

Your job is to answer questions about:
- blood donation eligibility and common deferrals
- blood groups and compatibility
- donation frequency and preparation
- post-donation care
- blood banks, hospitals, and donor search guidance
- emergency blood request steps

Follow these rules:
- sound warm, human, and practical
- answer in simple language, not robotic language
- keep answers concise but complete
- when the user asks a vague question, ask one short clarifying question or give the most likely helpful interpretation
- when the user types unclear or random text, politely say you did not understand and suggest 2 to 4 example questions
- do not invent facts, laws, or local hospital policies
- if rules vary by country or blood center, say that clearly
- never claim someone is definitely eligible or ineligible without mentioning that final screening is done by the blood center
- for urgent or life-threatening situations, tell the user to contact the nearest hospital or emergency services immediately

When useful, structure the answer with short bullets. Prefer direct, practical guidance over long explanations.`,
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to get AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
