export default {
  async fetch(request, env) {
    // Simple Cloudflare Worker proxy to OpenAI chat completions.
    // Students: set OPENAI_API_KEY and optional MODEL in your worker environment.
    try {
      const payload = await request.json();

      // Validate incoming messages parameter (must be an array)
      const messages = payload?.messages;
      if (!Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: "Missing or invalid 'messages' array in request body." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Choose model from env or default to gpt-4o (per project guidance)
      const model = env.MODEL || "gpt-4o";

      // Forward additional optional params (temperature, max_tokens) if provided
      const body = {
        model,
        messages,
        temperature: payload.temperature ?? 0.7,
        max_tokens: payload.max_tokens ?? 800
      };

      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!openaiRes.ok) {
        const error = await openaiRes.json();
        return new Response(JSON.stringify({ error: error.message }), {
          status: openaiRes.status,
          headers: { "Content-Type": "application/json" }
        });
      }

      const data = await openaiRes.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
