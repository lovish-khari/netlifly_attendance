const { clearCookie } = require('./lib/auth');

exports.handler = async () => ({
  statusCode: 302,
  headers: { Location: '/login.html', 'Set-Cookie': clearCookie(), 'Cache-Control': 'no-store' },
  body: '',
});