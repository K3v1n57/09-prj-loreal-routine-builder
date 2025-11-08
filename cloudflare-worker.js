export default {
  async fetch(request, env) {
    // CORS headers for local/dev. Lock down origin for production.
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    // Handle preflight quickly
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY in environment" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Expect JSON body with messages array
      let payload;
      try {
        payload = await request.json();
      } catch (err) {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const messages = payload?.messages;
      if (!Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: "Invalid request body: 'messages' must be an array" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Default to env.MODEL or project default 'gpt-4o'
      const model = env.MODEL || "gpt-4o";

      const body = {
        model,
        messages,
        max_tokens: payload.max_tokens ?? 800,
        temperature: payload.temperature ?? 0.7
      };

      // Call OpenAI once and read response as text -> parse to JSON (avoids double read)
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const text = await openaiRes.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (err) {
        // Non-JSON response from OpenAI (rare) — forward raw text for debugging
        const payloadBody = { error: "Non-JSON response from OpenAI", raw: text };
        return new Response(JSON.stringify(payloadBody), {
          status: openaiRes.status || 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (!openaiRes.ok) {
        // Forward OpenAI error body and status to client for easier debugging
        return new Response(JSON.stringify({ error: data.error || data }), {
          status: openaiRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Success: return the OpenAI JSON to the client
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (err) {
      // Unexpected worker error
      return new Response(JSON.stringify({ error: `Worker crashed: ${String(err)}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};
