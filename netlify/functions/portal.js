/* QOVES Creator Portal (Netlify Function)
   GET  /.netlify/functions/portal?id=recXXXX
        -> { status, revisionNotes, contentLink }
   POST /.netlify/functions/portal  { id, contentLink }
        -> saves the content link and sets status to "Draft submitted"
   Env: AIRTABLE_TOKEN (needs data.records:read AND data.records:write),
        AIRTABLE_BASE_ID, AIRTABLE_TABLE */
const CORS = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":"Content-Type",
  "Content-Type":"application/json"
};
const reply = (statusCode, obj) => ({ statusCode, headers: CORS, body: JSON.stringify(obj) });
const validId = id => /^rec[A-Za-z0-9]{6,}$/.test(id);

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:204, headers:CORS, body:"" };

  const { AIRTABLE_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_TABLE } = process.env;
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE) return reply(500, { error:"Server not configured." });
  const base = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`;
  const auth = { "Authorization":"Bearer "+AIRTABLE_TOKEN, "Content-Type":"application/json" };

  if (event.httpMethod === "GET") {
    const id = ((event.queryStringParameters || {}).id || "");
    if (!validId(id)) return reply(400, { error:"Invalid or missing id." });
    try {
      const air = await fetch(base + "/" + id, { headers: auth });
      if (!air.ok) { const d = await air.text().catch(()=> ""); console.error("Airtable read", air.status, d); return reply(502, { error:"Could not load record." }); }
      const rec = await air.json();
      const f = rec.fields || {};
      return reply(200, {
        status:        f["Content Status"] || "",
        revisionNotes: f["Revision Notes"] || "",
        contentLink:   f["Content Link"] || ""
      });
    } catch (e) { console.error("portal GET", e); return reply(500, { error:"Unexpected error." }); }
  }

  if (event.httpMethod === "POST") {
    let body; try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }
    const id = String(body.id || "");
    const contentLink = String(body.contentLink || "").trim();
    if (!validId(id)) return reply(400, { error:"Invalid or missing id." });
    if (!/^https?:\/\/\S+/.test(contentLink)) return reply(400, { error:"Invalid content link." });
    try {
      const air = await fetch(base + "/" + id, {
        method:"PATCH",
        headers: auth,
        body: JSON.stringify({ fields: { "Content Link": contentLink, "Content Status": "Draft submitted" }, typecast:true })
      });
      if (!air.ok) { const d = await air.text().catch(()=> ""); console.error("Airtable write", air.status, d); return reply(502, { error:"Could not save." }); }
      return reply(200, { ok:true });
    } catch (e) { console.error("portal POST", e); return reply(500, { error:"Unexpected error." }); }
  }

  return reply(405, { error:"Method not allowed" });
};
