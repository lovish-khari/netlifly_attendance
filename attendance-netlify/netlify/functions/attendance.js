const { authed, json } = require('./lib/auth');

const HEADERS = ['Employee ID', 'Name', 'Department', 'Date', 'Check-In', 'Check-Out', 'Total Hours', 'Status'];
const CACHE_MS = 30000;
const FETCH_TIMEOUT_MS = 8000;   // Netlify functions time out at ~10s, so fail before that

// One Apps Script web app per section, all sharing ONE token.
// Set these in Netlify -> Site configuration -> Environment variables (scope: Functions + Runtime):
//   APPS_SCRIPT_TOKEN           shared token, must match the token inside all three Apps Scripts
//   APPS_SCRIPT_URL             Anuvyom   (.../exec)
//   GUARD_APPS_SCRIPT_URL       Guard     (.../exec)
//   AEROSPACE_APPS_SCRIPT_URL   Aerospace (.../exec)
const SECTIONS = {
  anuvyom:   'APPS_SCRIPT_URL',
  guard:     'GUARD_APPS_SCRIPT_URL',
  aerospace: 'AEROSPACE_APPS_SCRIPT_URL',
};

const caches = {};   // per-section cache; lives while the function instance is warm

async function fetchRows(section) {
  const envName = SECTIONS[section];
  const base = (process.env[envName] || '').trim();
  const token = (process.env.APPS_SCRIPT_TOKEN || '').trim();
  if (!base) throw new Error(`not configured (missing ${envName})`);

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}?token=${encodeURIComponent(token)}`, { signal: ctl.signal });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) { throw new Error("Apps Script did not return JSON. Deploy it with access set to 'Anyone'."); }
    if (!Array.isArray(data)) throw new Error((data && data.error) || 'bad response');
    return data.map(x => Object.fromEntries(HEADERS.map(h => [h, String((x && x[h]) ?? '').trim()])));
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('timed out waiting for the sheet');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

exports.handler = async (event) => {
  if (!authed(event)) return json(401, { error: 'Not signed in' });
  const qs = event.queryStringParameters || {};
  const section = String(qs.section || 'anuvyom').toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(SECTIONS, section)) return json(400, { error: 'Unknown section' });

  const force = qs.refresh === '1';
  const cache = caches[section] || (caches[section] = { t: 0, rows: [], pending: null });
  let stale = false;   // true when a refresh failed and old rows are being served

  if (force || Date.now() - cache.t > CACHE_MS) {
    try {
      // share one in-flight request between simultaneous callers
      cache.pending = cache.pending || fetchRows(section).finally(() => { cache.pending = null; });
      cache.rows = await cache.pending;
      cache.t = Date.now();
    } catch (e) {
      if (!cache.rows.length) return json(502, { error: `${section}: could not read the sheet (${e.message})` });
      stale = true;
    }
  }
  return json(200, { section, rows: cache.rows, fetched: cache.t / 1000, stale });
};