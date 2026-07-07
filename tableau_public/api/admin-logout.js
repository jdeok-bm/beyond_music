/**
 * 관리자 로그아웃 — POST /api/admin-logout
 */
const { clearSessionCookie } = require('../lib/adminAuth');

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.setHeader('Set-Cookie', clearSessionCookie());
  return res.status(200).json({ ok: true });
};
