const { safeEq, makeCookie, json } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  const user = process.env.ADMIN_USER, pass = process.env.ADMIN_PASSWORD;
  // Never allow sign-in when credentials are not configured (empty == empty would match).
  if (!user || !pass || !process.env.SESSION_SECRET) {
    return json(500, { error: 'Server is not configured. Check ADMIN_USER, ADMIN_PASSWORD and SESSION_SECRET.' });
  }

  let b = {};
  try { b = JSON.parse(event.body || '{}'); } catch (e) {}
  if (!b || typeof b !== 'object') b = {};

  // Evaluate both checks so timing doesn't reveal which one failed.
  const okUser = safeEq(b.username || '', user);
  const okPass = safeEq(b.password || '', pass);
  if (!(okUser && okPass)) {
    await new Promise(r => setTimeout(r, 800)); // slows down guessing
    return json(401, { error: 'Wrong username or password.' });
  }
  return json(200, { ok: true }, { 'Set-Cookie': makeCookie() });
};