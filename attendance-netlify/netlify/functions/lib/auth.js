const crypto = require('crypto');
const TTL = 8 * 3600; // seconds

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET is not set');
  return s;
}
const sign = v => crypto.createHmac('sha256', secret()).update(v).digest('hex');

// Constant-time compare. Both sides are hashed first so different lengths don't leak.
const digest = v => crypto.createHash('sha256').update(String(v)).digest();
const safeEq = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));

function makeCookie() {
  const exp = String(Math.floor(Date.now() / 1000) + TTL);
  return `session=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL}`;
}
const clearCookie = () => 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';

function authed(event) {
  try {
    const m = /(?:^|;\s*)session=([^;]+)/.exec((event.headers && event.headers.cookie) || '');
    if (!m) return false;
    const [exp, sig] = m[1].split('.');
    return /^\d+$/.test(exp || '') && !!sig && Number(exp) > Date.now() / 1000 && safeEq(sig, sign(exp));
  } catch (e) {
    return false;   // e.g. SESSION_SECRET missing -> treat as signed out
  }
}

const json = (statusCode, body, headers = {}) => ({
  statusCode, body: JSON.stringify(body),
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
});

module.exports = { safeEq, makeCookie, clearCookie, authed, json };