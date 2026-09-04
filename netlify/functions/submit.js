/* QOVES Creator Program — application intake proxy (Netlify Function)
   POST /.netlify/functions/submit -> forwards to Airtable with a secret token.
   ENV VARS (Netlify -> Site settings):
     AIRTABLE_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_TABLE (e.g. "Creator Applications")
     NOTIFY_URL  (n8n webhook, e.g. https://n8n.qoves.com/webhook/creator-portal-notify)
     NOTIFY_SECRET (x-qoves-notify-secret header value) */
const HITS = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 6;
function rateLimited(ip){
  const now = Date.now();
  const arr = (HITS.get(ip) || []).filter(t => now - t < WINDOW_MS);
  arr.push(now); HITS.set(ip, arr);
  return arr.length > MAX_PER_WINDOW;
}
// form field -> your Airtable "Creator Applications" column (EXACT, case-sensitive)
const FIELD_MAP = {
  name:"Name", email:"Email", handle:"Handle", age:"Age Range", platform:"Primary Platform",
  audience:"Audience Size", niche:"Content Niche",
  example1:"Content Example 1", example2:"Content Example 2",
  exampleNotes:"Content Examples Notes", rate:"Expected Rate",
  location:"Location", about:"About", consent:"Consent"
};
const CORS = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Access-Control-Allow-Headers":"Content-Type",
  "Content-Type":"application/json"
};
const reply = (statusCode, obj) => ({ statusCode, headers: CORS, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:204, headers:CORS, body:"" };
  if (event.httpMethod !== "POST") return reply(405, { error:"Method not allowed" });

  const h = event.headers || {};
  const ip = (h["x-forwarded-for"] || h["client-ip"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return reply(429, { error:"Too many submissions, slow down." });

  let body; try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }
  if (body.company) return reply(200, { trackingId:"QA-IGNORED" });

  const required = ["name","email","handle","age","platform","audience","niche","example1","about"];
  for (const f of required){ if(!body[f] || !String(body[f]).trim()) return reply(400,{ error:"Missing required field: "+f }); }
  if (!/^\S+@\S+\.\S+$/.test(body.email)) return reply(400,{ error:"Invalid email." });

  const fields = {};
  for (const [src,dest] of Object.entries(FIELD_MAP)){ const v=body[src]; if(v!==undefined&&v!==null&&v!=="") fields[dest]=v; }
  if (fields["Expected Rate"]!==undefined) fields["Expected Rate"] = Number(fields["Expected Rate"]) || 0;

  const trackingId = "QA-"+new Date().getFullYear()+"-"+Math.random().toString(36).slice(2,7).toUpperCase();
  fields["Application ID"] = trackingId;
  fields["Application Status"] = "New";

  const { AIRTABLE_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_TABLE, NOTIFY_URL, NOTIFY_SECRET } = process.env;
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE) return reply(500,{ error:"Server not configured (missing Airtable env vars)." });

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`;
  try {
    const air = await fetch(url, {
      method:"POST",
      headers:{ "Authorization":"Bearer "+AIRTABLE_TOKEN, "Content-Type":"application/json" },
      body: JSON.stringify({ records:[{ fields }], typecast:true })
    });
    if (!air.ok){ const d = await air.text().catch(()=> ""); console.error("Airtable error", air.status, d); return reply(502,{ error:"Could not save to Airtable." }); }

    if (NOTIFY_URL) {
      fetch(NOTIFY_URL, {
        method:"POST",
        headers:{ "Content-Type":"application/json", "x-qoves-notify-secret": NOTIFY_SECRET||"" },
        body: JSON.stringify({
          event:"application_submitted",
          name: body.name,
          email: body.email,
          handle: body.handle,
          platform: body.platform,
          niche: body.niche,
          audience: body.audience,
          example1: body.example1,
          example2: body.example2||"",
          exampleNotes: body.exampleNotes||"",
          rate: body.rate||"",
          about: body.about||"",
          applicationId: trackingId
        })
      }).catch(e => console.error("Notify error", e));
    }

    return reply(200, { trackingId });
  } catch (e) { console.error("Proxy error", e); return reply(500,{ error:"Unexpected server error." }); }
};
