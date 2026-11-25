# Attendance dashboard — Netlify version

Static dashboard (`public/`) + Netlify Functions (`netlify/functions/`) for login and for
reading your Apps Script. The Apps Script URL and token stay in Netlify env vars, never in the browser.

## Deploy
1. Push this folder to a GitHub repo.
2. Netlify → Add new site → Import from Git → pick the repo (settings are read from `netlify.toml`).
3. Site configuration → Environment variables → add the 5 values from `.env.example`.
4. Deploys → Trigger deploy. Open the site URL and sign in.

CLI alternative: `npm i -g netlify-cli`, then `netlify init`, set the env vars, `netlify deploy --prod`.
Local test: `netlify dev` with a `.env` file.
