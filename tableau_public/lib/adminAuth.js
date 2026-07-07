/**
 * 관리자 세션용 서명 쿠키 헬퍼
 * 별도 세션 저장소 없이, HMAC 서명된 만료시각을 쿠키에 담아 검증합니다.
 */
const crypto = require('crypto');

const COOKIE_NAME = 'bm_admin';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12시간

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function createSessionCookie(secret) {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = String(expires);
  const value = `${payload}.${sign(payload, secret)}`;
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function isSessionValid(req, secret) {
  const raw = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!raw) return false;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload, secret);
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(sig);
  if (expectedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expectedBuf, sigBuf)) {
    return false;
  }
  const expires = Number(payload);
  return Number.isFinite(expires) && Date.now() < expires;
}

module.exports = { COOKIE_NAME, createSessionCookie, clearSessionCookie, isSessionValid };
