/**
 * 관리자 세션 확인 — GET /api/admin-session
 */
const { isSessionValid } = require('../lib/adminAuth');

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const { ADMIN_SECRET } = process.env;
  if (!ADMIN_SECRET) {
    return res.status(200).json({ authenticated: false, misconfigured: true });
  }

  return res.status(200).json({ authenticated: isSessionValid(req, ADMIN_SECRET) });
};
