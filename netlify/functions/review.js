/* QOVES VA review -> creator portal (Netlify Function)
   POST /.netlify/functions/review  { id, key, revisionNotes, status }
   Writes the VA's feedback + verdict into the creator's Airtable row.
   Protected by a shared REVIEW_KEY so only the internal review tool can post.
   Env: AIRTABLE_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_TABLE, REVIEW_KEY */
const CORS = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Access-Control-Allow-Headers":"Content-Type",
  "Content-Type":"application/json"
};
const reply = (statusCode, obj) => ({ statusCode, headers: CORS, body: JSON.stringify(obj) });
const validId = id => /^rec[A-Za-z0-9]{6,}$/.test(id);

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:204, headers:CORS, body:"" };
  if (event.httpMethod !== "POST") return reply(405, { error:"Method not allowed" });

  const { AIRTABLE_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_TABLE, REVIEW_KEY } = process.env;
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE) return reply(500, { error:"Server not configured." });

  let body; try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }
  if (!REVIEW_KEY || body.key !== REVIEW_KEY) return reply(401, { error:"Unauthorized." });

  const id = String(body.id || "");
  if (!validId(id)) return reply(400, { error:"Invalid or missing record id." });

  const fields = {};
  if (typeof body.revisionNotes === "string" && body.revisionNotes.trim()) fields["Revision Notes"] = body.revisionNotes;
  if (typeof body.status === "string" && body.status.trim()) fields["Content Status"] = body.status;
  if (!Object.keys(fields).length) return reply(400, { error:"Nothing to update." });

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}/${id}`;
  try {
    const air = await fetch(url, {
      method:"PATCH",
      headers:{ "Authorization":"Bearer "+AIRTABLE_TOKEN, "Content-Type":"application/json" },
      body: JSON.stringify({ fields, typecast:true })
    });
    if (!air.ok) { const d = await air.text().catch(()=> ""); console.error("Airtable review", air.status, d); return reply(502, { error:"Could not update record." }); }
    return reply(200, { ok:true });
  } catch (e) { console.error("review error", e); return reply(500, { error:"Unexpected error." }); }
};
