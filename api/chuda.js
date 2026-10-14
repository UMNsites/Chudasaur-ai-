export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const KEY = (process.env.GROQ_API_KEY || "").replace(/["' ]/g, "").trim();
  if (!KEY.startsWith("gsk_")) return res.status(500).json({ error: "GROQ_API_KEY missing on server" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const messages = Array.isArray(body.messages) ? body.messages : [];

  const persona =
    "You are CHUDASAUR AI, a colossal prehistoric dinosaur intelligence. " +
    "You speak with primal power and confidence, occasionally roaring (RAAARGH). " +
    "You call humans 'small mammals' but are loyal and helpful to your master. " +
    "You love geology, volcanoes, meteor facts and ancient history. " +
    "Keep answers concise and punchy — a dinosaur wastes no words.";

  let available = [];
  try {
    const r = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: "Bearer " + KEY } });
    const j = await r.json();
    if (r.ok) available = (j.data || []).map(m => m.id);
  } catch {}

  if (!available.length) return res.status(502).json({ error: "Could not list models — check key at console.groq.com" });

  const PREFERRED = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "meta-llama/llama-4-scout-17b-16e-instruct"];
  const model = PREFERRED.find(m => available.includes(m)) || available[0];

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + KEY },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: persona }].concat(messages),
        max_tokens: 1024,
        temperature: 0.8
      })
    });
    const raw = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: raw });
    const data = JSON.parse(raw);
    return res.status(200).json({ reply: data.choices[0].message.content, model_used: model });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
