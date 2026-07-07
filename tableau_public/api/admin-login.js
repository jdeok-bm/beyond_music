/**
 * 관리자 로그인 — POST /api/admin-login
 * body: { password: string }
 */
const crypto = require('crypto');
const { createSessionCookie } = require('../lib/adminAuth');

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', method: req.method });
  }

  const { ADMIN_PASSWORD, ADMIN_SECRET } = process.env;
  if (!ADMIN_PASSWORD || !ADMIN_SECRET) {
    console.error('[admin-login] Missing env vars: ADMIN_PASSWORD / ADMIN_SECRET');
    return res.status(500).json({
      error: 'Server misconfiguration',
      message: 'Vercel 환경변수(ADMIN_PASSWORD, ADMIN_SECRET)를 등록한 뒤 Redeploy 하세요.',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const password = body && typeof body.password === 'string' ? body.password : '';
  if (!password) {
    return res.status(400).json({ error: 'password가 필요합니다' });
  }

  const a = Buffer.from(password);
  const b = Buffer.from(ADMIN_PASSWORD);
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!match) {
    return res.status(401).json({ error: '비밀번호가 올바르지 않습니다' });
  }

  res.setHeader('Set-Cookie', createSessionCookie(ADMIN_SECRET));
  return res.status(200).json({ ok: true });
};
