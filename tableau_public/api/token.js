/**
 * Tableau Connected Apps JWT 발급 엔드포인트
 * POST /api/token
 */

const crypto = require('crypto');

function base64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJWT(header, payload, secret) {
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest();
  return `${data}.${base64url(sig)}`;
}

function getMissingEnvVars() {
  const required = [
    'TABLEAU_CLIENT_ID',
    'TABLEAU_SECRET_ID',
    'TABLEAU_SECRET_VALUE',
    'TABLEAU_USERNAME',
  ];
  return required.filter(k => !process.env[k]);
}

module.exports = function handler(req, res) {
  // CORS 설정
  const allowedOrigin = process.env.TOKEN_AUDIENCE || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', method: req.method });
  }

  // 환경변수 체크
  const missing = getMissingEnvVars();
  if (missing.length > 0) {
    console.error('[token] Missing env vars:', missing);
    return res.status(500).json({
      error: 'Server misconfiguration',
      message: 'Vercel 대시보드에서 환경변수를 등록한 뒤 Redeploy 하세요.',
      missing,
    });
  }

  try {
    const {
      TABLEAU_CLIENT_ID,
      TABLEAU_SECRET_ID,
      TABLEAU_SECRET_VALUE,
      TABLEAU_USERNAME,
      TABLEAU_SITE_NAME = '',
    } = process.env;

    const now = Math.floor(Date.now() / 1000);

    const header = {
      alg: 'HS256',
      typ: 'JWT',
      kid: TABLEAU_SECRET_ID,
      iss: TABLEAU_CLIENT_ID,
    };

    const payload = {
      iss: TABLEAU_CLIENT_ID,
      iat: now,
      nbf: now - 5,
      exp: now + 300,
      jti: crypto.randomUUID(),
      aud: 'tableau',
      sub: TABLEAU_USERNAME,
      scp: ['tableau:views:embed', 'tableau:metrics:embed'],
    };

    if (TABLEAU_SITE_NAME) {
      payload['https://tableau.com/oda/claims/site'] = TABLEAU_SITE_NAME;
    }

    const token = signJWT(header, payload, TABLEAU_SECRET_VALUE);
    return res.status(200).json({ token, expiresIn: 300 });

  } catch (err) {
    console.error('[token] JWT generation error:', err);
    return res.status(500).json({
      error: 'Failed to generate token',
      message: err && err.message ? err.message : String(err),
    });
  }
};
