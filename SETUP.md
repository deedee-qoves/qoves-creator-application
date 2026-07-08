# QOVES Creator Program — Application form setup

This is a **separate site** from the video portal. It reuses the same Airtable **base**, but writes to a **new table**, and it's its own repo + Netlify project with its own environment variables. Nothing here touches your existing creator portal.

The path is the same pattern you already know: branded form → Netlify function (proxy) → Airtable.

Two pages: visitors land on **index.html** (the landing page) and click **Apply now**, which opens **submit.html** (the application form).

---

## Step 1 — Add a new table in your existing Airtable base

1. Open your Airtable base (the same one with your Campaigns table).
2. Add a new table named **`Creator Applications`**.
3. Create these fields. **Names must match exactly** (case + spaces):

| Field name              | Type            | Options |
|-------------------------|-----------------|---------|
| `Application ID`        | Single line text | filled automatically |
| `Name`                  | Single line text | |
| `Email`                 | Email           | |
| `Handle`                | Single line text | |
| `Age Range`             | Single select   | 18–24, 25–34, 35–44, 45–54, 55+ |
| `Primary Platform`      | Single select   | TikTok, Instagram, YouTube, YouTube Shorts, X / Twitter, Other |
| `Audience Size`         | Single select   | Under 10k, 10k–50k, 50k–100k, 100k–250k, 250k–1M, 1M+ |
| `Content Niche`         | Single select   | Beauty, Skincare, Fitness, Fashion, Lifestyle, Men's Grooming, Self-Optimisation, Other |
| `Content Example 1`     | URL             | |
| `Content Example 2`     | URL             | |
| `Content Examples Notes`| Long text       | |
| `Expected Rate`         | Currency (USD)  | |
| `Location`              | Single line text | |
| `About`                 | Long text       | |
| `Application Status`    | Single select   | New, Reviewing, Shortlisted, Approved, Rejected |
| `Date Applied`          | Created time    | filled automatically by Airtable |
| `Consent`               | Checkbox        | ticked when the applicant agrees (recorded automatically) |

(Single-select options are created automatically on first submission via typecast, but adding them now lets you set colors.)

---

## Step 2 — Put the files on GitHub (new repo)

1. github.com → **+** → **New repository** → name it `qoves-creator-application` → **Create repository**.
2. On the empty repo page, click **uploading an existing file** (or **Add file → Upload files**).
3. Unzip `qoves-creator-application-site.zip`, open the `qoves-creator-application` folder, and drag **everything inside** it (`index.html` = the landing page, `submit.html` = the application form, `netlify.toml`, and the `netlify` folder) into the upload area.
4. Click **Commit changes**.

> Upload the files that are *inside* the folder, so `index.html` sits at the top of the repo. (This avoids the "one folder too deep" 404 from last time.)

---

## Step 3 — New Netlify project from this repo

1. app.netlify.com → **Add new site → Import an existing project → Deploy with GitHub**.
2. Pick the **qoves-creator-application** repo.
3. Leave build command blank and publish directory as `.`. Click **Deploy**.

---

## Step 4 — Environment variables (point at the new table)

In this new Netlify project → **Site configuration → Environment variables**, add:

| Key                | Value |
|--------------------|-------|
| `AIRTABLE_TOKEN`   | your `pat...` token (the same one is fine) |
| `AIRTABLE_BASE_ID` | your `app...` id (same base as the portal) |
| `AIRTABLE_TABLE`   | `Creator Applications` |

Then **Deploys → Trigger deploy → Deploy project** so the function picks them up.

> Your token needs `data.records:write` on this base — the existing token already has that, so you can reuse it.

---

## Step 5 — Rename the site + test

1. **Change site name** (search "Change site name" in Netlify) to something like `qoves-apply` → URL becomes `qoves-apply.netlify.app`.
2. Open the site, submit a test application.
3. You should see a reference ID like `QA-2026-AB3CD`, and a new row in your **Creator Applications** table with **Application Status = New**.

---

## Notes
- Two live sites now share one Airtable base: the **video portal** writes to `Campaigns`, and this **application form** writes to `Creator Applications`. They don't interfere.
- To review applicants, make a **Kanban view** on the Creator Applications table stacked by `Application Status`.
- Want an email alert when someone applies? Add an Airtable automation ("When record created → Send email") to invoice@qoves.com / deedee@qoves.com.
- To preview the page look before deploying, open `index.html` and set `DEMO_MODE = true` near the bottom of the script (fakes success, saves nothing). Set back to `false` before going live.
