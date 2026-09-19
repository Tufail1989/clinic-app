// Netlify Function: the clinic agent's brain.
// The API key lives in Netlify's environment variables, never in the page.
// Endpoint: /.netlify/functions/chat

const MODEL = process.env.MODEL || "claude-haiku-4-5";

function buildSystem(c, history) {
  const name = String(c.name || "the clinic").slice(0, 80);
  const city = String(c.city || "").slice(0, 60);
  const phone = String(c.phone || "").slice(0, 40);
  const hours = String(c.hours || "").slice(0, 120);
  const cur = String(c.cur || "").slice(0, 10);
  const langs = String(c.lang || "English, Urdu, Roman Urdu").slice(0, 120);
  const doctors = String(c.doctors || "").slice(0, 200);
  const notes = String(c.notes || "").slice(0, 400);
  const faq = String(c.faq || "").slice(0, 1200);
  const services = String(c.services || "").slice(0, 1200)
    .split("\n").map(l => l.trim()).filter(Boolean)
    .map(l => {
      const i = l.indexOf(":");
      return i < 0 ? `- ${l}` : `- ${l.slice(0, i).trim()}: ${cur} ${l.slice(i + 1).trim()}`;
    }).join("\n");

  return `You are the WhatsApp receptionist for ${name}, a clinic in ${city}. You are warm, brief and human — never robotic, never repeat a greeting the patient has already had.
Phone: ${phone}. Timings: ${hours}.${doctors ? ` Doctors: ${doctors}.` : ""}
Prices (ranges; the doctor confirms the exact price after examining the patient):
${services || "- Ask the patient to call for prices."}
${notes ? `Other notes: ${notes}` : ""}
${faq ? `Clinic FAQs (use these answers when they fit):\n${faq}` : ""}
${history ? `This patient's history at the clinic: ${String(history).slice(0, 500)}` : ""}

Your job: answer the patient naturally, collect what you need for a booking (what they need, their name, urgency, preferred day and time), then tell them the front desk will confirm. Never claim a slot is already confirmed.

Style: real WhatsApp messages. One to three short sentences. No markdown, no bullet lists, no bold. Mirror the patient's language exactly — if they write Roman Urdu, reply in Roman Urdu; if Urdu script, reply in Urdu script; if English, English. Ask one question at a time. Vary your wording; never send the same sentence twice in a conversation.

Safety rules, always: never diagnose, never interpret photos or reports, never name medicines or doses — say the doctor must examine them. Emergency signs (spreading facial or neck swelling, trouble breathing or swallowing, bleeding that will not stop, chest pain, knocked-out tooth, major injury, fits, high fever in a small child): tell them to call ${phone} now, and to go to the nearest emergency department if breathing or swallowing is affected, then set status to "Emergency - staff alerted". Never invent prices, doctors, discounts or available slots.

Reply with ONLY a JSON object, no other text:
{"reply": "your message to the patient", "lead": {"name": "", "treatment": "", "urgency": "Emergency|Same day|Within 48 hours|Routine|", "preferred_time": "", "status": ""}}
Leave a lead field as an empty string when it is not known yet.`;
}

exports.handler = async function (event) {
  const json = (code, body) => ({
    statusCode: code,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(body),
  });

  // Health check used by the page to decide whether live AI is available
  if (event.httpMethod === "GET") {
    return json(200, { ok: true, ai: !!process.env.ANTHROPIC_API_KEY, needsCode: !!process.env.ACCESS_CODE, model: MODEL });
  }
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });

  const code = process.env.ACCESS_CODE;
  if (code) {
    const sent = event.headers["x-access-code"] || event.headers["X-Access-Code"];
    if (sent !== code) return json(401, { error: "Access code required" });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(500, { error: "ANTHROPIC_API_KEY is not set in Netlify environment variables" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-24)
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map(m => ({ role: m.role, content: m.content.slice(0, 1500) }));
  if (!messages.length) return json(400, { error: "No messages" });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: buildSystem(body.clinic || {}, body.history || ""),
        messages,
      }),
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      return json(502, { error: `Claude API ${res.status}`, detail });
    }

    const data = await res.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();

    let parsed = null;
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1));
    } catch { parsed = null; }

    return json(200, {
      reply: (parsed && parsed.reply) || text || "Sorry, could you say that again?",
      lead: (parsed && parsed.lead) || {},
      usage: data.usage || null,
    });
  } catch (e) {
    return json(502, { error: "Upstream failure", detail: String(e && e.message).slice(0, 200) });
  }
};
