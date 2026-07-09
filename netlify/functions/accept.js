/* QOVES Creator Program — agreement acceptance (Netlify Function)
   POST /.netlify/functions/accept  { id: "recXXXX", accepted: true }
   Stamps the applicant's row in Airtable as having accepted the agreement.
   Uses the same env vars as submit.js: AIRTABLE_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_TABLE */
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

  let body; try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }
  const id = String(body.id || "");
  if (!/^rec[A-Za-z0-9]{6,}$/.test(id)) return reply(400, { error:"Invalid or missing record id." });
  if (body.accepted !== true) return reply(400, { error:"Agreement not accepted." });

  const { AIRTABLE_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_TABLE } = process.env;
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE) return reply(500, { error:"Server not configured." });

  const today = new Date().toISOString().slice(0,10);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}/${id}`;
  try {
    const air = await fetch(url, {
      method:"PATCH",
      headers:{ "Authorization":"Bearer "+AIRTABLE_TOKEN, "Content-Type":"application/json" },
      body: JSON.stringify({ fields: { "Agreement Accepted": true, "Agreement Accepted Date": today }, typecast:true })
    });
    if (!air.ok) { const d = await air.text().catch(()=> ""); console.error("Airtable error", air.status, d); return reply(502, { error:"Could not record acceptance." }); }
    return reply(200, { ok:true });
  } catch (e) { console.error("Accept error", e); return reply(500, { error:"Unexpected server error." }); }
};
