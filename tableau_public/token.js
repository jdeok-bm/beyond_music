/**
 * Tableau Connected Apps JWT 발급 엔드포인트
 * POST /api/token
 *
 * Vercel 환경변수 (Settings → Environment Variables) 에 아래 값을 등록하세요:
 *   TABLEAU_SERVER_URL     예) https://prod-apnortheast-a.online.tableau.com
 *   TABLEAU_SITE_NAME      예) mycompany  (Default Site 이면 빈 문자열 "")
 *   TABLEAU_CLIENT_ID      Connected Apps 에서 발급한 Client ID
 *   TABLEAU_SECRET_ID      Connected Apps Secret의 ID (Secret Value 아님)
 *   TABLEAU_SECRET_VALUE   Connected Apps Secret의 Value
 *   TABLEAU_USERNAME       임베딩에 사용할 Tableau 계정 이메일 (본인 계정)
 *   TOKEN_AUDIENCE         이 API를 호출할 수 있는 포털 URL (CORS 보안용)
 *                          예) https://my-portal.vercel.app
 */

import * as crypto from 'crypto';

// ─── 경량 JWT 서명 (외부 라이브러리 없이) ───
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

// ─── 환경변수 검증 ───
function getMissingEnvVars() {
  const required = [
    'TABLEAU_CLIENT_ID',
    'TABLEAU_SECRET_ID',
    'TABLEAU_SECRET_VALUE',
    'TABLEAU_USERNAME',
  ];
  return required.filter(k => !process.env[k]);
}

// ─── 핸들러 ───
export default function handler(req, res) {
  // CORS 설정
  const allowedOrigin = process.env.TOKEN_AUDIENCE || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 환경변수 체크
  const missing = getMissingEnvVars();
  if (missing.length > 0) {
    console.error('Missing env vars:', missing);
    return res.status(500).json({
      error: 'Server misconfiguration',
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
      exp: now + 300,          // 5분 유효 (Tableau 권장 최대치)
      jti: crypto.randomUUID(),
      aud: 'tableau',
      sub: TABLEAU_USERNAME,
      scp: ['tableau:views:embed', 'tableau:metrics:embed'],
      // On-Demand Access 사용 시 아래 주석 해제:
      // '#odagenerated': true,
    };

    // Site name 클레임 (Default Site 이면 생략)
    if (TABLEAU_SITE_NAME) {
      payload['https://tableau.com/oda/claims/site'] = TABLEAU_SITE_NAME;
    }

    const token = signJWT(header, payload, TABLEAU_SECRET_VALUE);

    return res.status(200).json({ token });
  } catch (err) {
    console.error('JWT generation error:', err);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
}
