/**
 * 진단 엔드포인트 — GET /api/diag
 * 환경변수의 **존재 여부**만 노출합니다. 값은 노출하지 않습니다.
 */
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const keys = [
    'TABLEAU_SERVER_URL',
    'TABLEAU_SITE_NAME',
    'TABLEAU_CLIENT_ID',
    'TABLEAU_SECRET_ID',
    'TABLEAU_SECRET_VALUE',
    'TABLEAU_USERNAME',
    'TOKEN_AUDIENCE',
  ];

  const env = {};
  keys.forEach(k => {
    const v = process.env[k];
    env[k] = v
      ? { present: true, length: v.length, preview: k === 'TABLEAU_SECRET_VALUE' ? null : v.slice(0, 8) }
      : { present: false };
  });

  res.status(200).json({
    ok: true,
    nodeVersion: process.version,
    vercelRegion: process.env.VERCEL_REGION || null,
    deploymentUrl: process.env.VERCEL_URL || null,
    env,
    hint: 'All keys must show present:true. Mismatched TOKEN_AUDIENCE or missing TABLEAU_* keys are common causes of the 25s timeout in the portal.',
  });
};
