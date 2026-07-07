/**
 * 대시보드 설정 저장 & 자동 배포 — POST /api/save-dashboards
 * body: { categories: string[], dashboards: object[] }
 *
 * 관리자 세션이 유효할 때, 전달받은 설정을 GitHub Contents API로
 * tableau_public/public/dashboards.json 에 커밋합니다.
 * 커밋이 생기면 Vercel Git 연동이 자동으로 재배포합니다.
 */
const { isSessionValid } = require('../lib/adminAuth');

const FILE_PATH = 'tableau_public/public/dashboards.json';

function ghHeaders(token) {
  return {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'beyondmusic-dashboards',
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', method: req.method });
  }

  const { ADMIN_SECRET, GITHUB_TOKEN } = process.env;
  const repo = process.env.GITHUB_REPO || 'jdeok-bm/beyond_music';
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!ADMIN_SECRET) {
    return res.status(500).json({ error: 'Server misconfiguration', message: 'ADMIN_SECRET 환경변수가 없습니다.' });
  }
  if (!isSessionValid(req, ADMIN_SECRET)) {
    return res.status(401).json({ error: '관리자 로그인이 필요합니다' });
  }
  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'Server misconfiguration', message: 'GITHUB_TOKEN 환경변수를 등록한 뒤 Redeploy 하세요.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || !Array.isArray(body.dashboards) || !Array.isArray(body.categories)) {
    return res.status(400).json({ error: 'categories(배열)와 dashboards(배열)가 필요합니다' });
  }

  // 저장 형식 정규화 — 클라이언트가 임의 필드를 밀어넣지 못하도록 화이트리스트로 재구성
  const payload = {
    version: 1,
    categories: body.categories.map(c => String(c)).filter(Boolean),
    dashboards: body.dashboards.map(d => ({
      id: String(d.id || ''),
      name: String(d.name || ''),
      category: String(d.category || ''),
      url: String(d.url || ''),
      height: Number(d.height) || 800,
      refresh: String(d.refresh || 'daily'),
      desc: String(d.desc || ''),
      createdAt: String(d.createdAt || new Date().toISOString()),
    })),
  };
  const newContent = JSON.stringify(payload, null, 2) + '\n';

  try {
    const fileUrl = `https://api.github.com/repos/${repo}/contents/${FILE_PATH}?ref=${encodeURIComponent(branch)}`;
    const getRes = await fetch(fileUrl, { headers: ghHeaders(GITHUB_TOKEN) });
    if (!getRes.ok) {
      const detail = await getRes.text();
      console.error('[save-dashboards] GitHub GET failed:', getRes.status, detail.slice(0, 300));
      return res.status(502).json({
        error: 'GitHub에서 현재 파일을 읽지 못했습니다',
        status: getRes.status,
        message: getRes.status === 401 || getRes.status === 403
          ? 'GITHUB_TOKEN 권한(repo 쓰기)을 확인하세요.'
          : undefined,
      });
    }
    const current = await getRes.json();

    // 내용이 동일하면 불필요한 커밋/재배포를 만들지 않습니다
    const currentContent = Buffer.from(current.content || '', 'base64').toString('utf8');
    if (currentContent === newContent) {
      return res.status(200).json({ ok: true, unchanged: true, message: '변경사항이 없습니다' });
    }

    const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: { ...ghHeaders(GITHUB_TOKEN), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Update dashboards.json via admin page',
        content: Buffer.from(newContent, 'utf8').toString('base64'),
        sha: current.sha,
        branch,
      }),
    });
    if (!putRes.ok) {
      const detail = await putRes.text();
      console.error('[save-dashboards] GitHub PUT failed:', putRes.status, detail.slice(0, 300));
      return res.status(502).json({ error: 'GitHub 커밋에 실패했습니다', status: putRes.status });
    }
    const result = await putRes.json();
    return res.status(200).json({
      ok: true,
      commit: result.commit && result.commit.sha ? result.commit.sha.slice(0, 7) : null,
      message: '커밋 완료 — Vercel이 자동 재배포합니다 (1~2분 소요)',
    });
  } catch (err) {
    console.error('[save-dashboards] error:', err);
    return res.status(500).json({ error: '저장 중 오류가 발생했습니다', message: err && err.message ? err.message : String(err) });
  }
};
