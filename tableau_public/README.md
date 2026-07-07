# Beyond Music Dashboards — 배포 가이드

방문자 로그인 없이 Tableau 대시보드를 임베딩하는 뷰어 포털입니다.
Vercel 서버리스 함수가 JWT를 발급하므로 Secret Key가 브라우저에 노출되지 않습니다.

뷰어(`/`)는 대시보드를 그룹별로 보기만 하는 화면이고, 관리(`/admin`)는 비밀번호로 보호된
대시보드·그룹 관리 화면입니다.

---

## 구조

```
tableau_public/
├── public/
│   ├── index.html           # 뷰어 프론트엔드 (일반 방문자, 로그인 불필요)
│   ├── admin.html            # 관리자 프론트엔드 (비밀번호 필요)
│   └── dashboards.json       # 공유 대시보드/그룹 설정 (관리자가 내보낸 JSON을 커밋)
├── api/
│   ├── token.js               # Tableau JWT 발급 (Vercel)
│   ├── admin-login.js         # 관리자 로그인 (비밀번호 검증 + 세션 쿠키 발급)
│   ├── admin-session.js       # 관리자 세션 확인
│   ├── admin-logout.js        # 관리자 로그아웃
│   ├── save-dashboards.js     # 배포하기 — dashboards.json 을 GitHub에 자동 커밋
│   └── diag.js                 # 환경변수 진단
├── lib/
│   └── adminAuth.js            # 관리자 세션 쿠키 서명/검증 헬퍼
├── vercel.json                 # Vercel 라우팅 설정
└── .env.example
```

---

## Step 1 — Tableau Connected Apps 설정 (5분)

1. Tableau Cloud 관리자 계정으로 로그인
2. 상단 메뉴 **설정(Settings)** → **Connected Apps** 탭 이동
3. **새 Connected App 만들기** 클릭
   - 이름: `Beyond Music Dashboards` (자유)
   - 접근 레벨: **모든 프로젝트** 또는 원하는 프로젝트 지정
4. 생성된 앱 클릭 → **Client ID** 복사해두기
5. **Secrets** 탭 → **새 Secret 생성**
   - **Secret ID**와 **Secret Value** 를 모두 복사 (Value는 이 화면에서만 확인 가능)
6. Connected App **활성화** 토글 ON

> ⚠️ Secret Value는 생성 직후 한 번만 표시됩니다. 반드시 즉시 복사하세요.

---

## Step 2 — GitHub 저장소 생성

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/tableau-portal.git
git push -u origin main
```

---

## Step 3 — Vercel 배포

1. [vercel.com](https://vercel.com) 접속 → GitHub 계정으로 로그인
2. **Add New Project** → 위에서 만든 저장소 선택
3. **Deploy** 클릭 (설정 변경 없이 바로 배포)
4. 배포 완료 후 발급된 URL 확인 (예: `https://tableau-portal-xxx.vercel.app`)

---

## Step 4 — 환경변수 등록

Vercel 대시보드 → 프로젝트 선택 → **Settings** → **Environment Variables**

| 변수명 | 값 |
|---|---|
| `TABLEAU_SERVER_URL` | `https://prod-apnortheast-a.online.tableau.com` |
| `TABLEAU_SITE_NAME` | Site 이름 (Default Site이면 빈 문자열) |
| `TABLEAU_CLIENT_ID` | Step 1에서 복사한 Client ID |
| `TABLEAU_SECRET_ID` | Step 1에서 복사한 Secret ID |
| `TABLEAU_SECRET_VALUE` | Step 1에서 복사한 Secret Value |
| `TABLEAU_USERNAME` | 본인 Tableau 계정 이메일 |
| `TOKEN_AUDIENCE` | 배포된 Vercel URL (예: `https://tableau-portal-xxx.vercel.app`) |
| `ADMIN_PASSWORD` | `/admin` 로그인에 사용할 비밀번호 (직접 정하세요) |
| `ADMIN_SECRET` | 세션 쿠키 서명용 임의의 긴 문자열 (예: `openssl rand -hex 32`) |
| `GITHUB_TOKEN` | repo 쓰기 권한이 있는 GitHub 토큰 — 관리자 페이지의 **배포하기** 버튼(자동 커밋·배포)에 사용 |
| `GITHUB_REPO` | (선택) 대상 저장소. 기본값 `jdeok-bm/beyond_music` |
| `GITHUB_BRANCH` | (선택) 커밋 대상 브랜치. 기본값 `main` |

등록 후 **Redeploy** (Deployments 탭 → 최신 배포 우클릭 → Redeploy)

`ADMIN_PASSWORD` / `ADMIN_SECRET`이 없으면 `/admin` 로그인이 항상 실패하고,
`GITHUB_TOKEN`이 없으면 배포하기 버튼이 실패합니다(수동 JSON 커밋은 계속 가능).

---

## Step 5 — 대시보드·그룹 등록

1. 배포된 사이트에서 `/admin` 접속 후 `ADMIN_PASSWORD`로 로그인
2. **대시보드 추가** 버튼으로 이름·그룹·URL 등록 (Tableau Public URL 권장)
3. **그룹(카테고리)** 패널에서 그룹 순서·이름을 원하는 대로 구성
4. 우측 상단 **배포하기** 클릭 — 서버가 GitHub의
   `tableau_public/public/dashboards.json` 에 자동으로 커밋하고, Vercel이 재배포합니다
5. 1~2분 뒤 뷰어(`/`)의 모든 방문자에게 동일한 대시보드·그룹이 보입니다

> 자동 배포가 실패하는 경우(`GITHUB_TOKEN` 미설정·만료 등)에는 **팀과 공유하기** 탭의
> **JSON 복사** → GitHub에서 파일 교체 → commit 으로 수동 반영할 수 있습니다.
> 배포 전 작업 내용은 브라우저 로컬 저장소에 임시 저장되어, 창을 닫아도 이어서 작업할 수 있습니다.

---

## 동작 원리

```
방문자 브라우저 (/)                      관리자 브라우저 (/admin)
  │                                          │
  ├─ index.html 로드                        ├─ 비밀번호 로그인 → 세션 쿠키
  ├─ GET /dashboards.json (그룹·대시보드)    ├─ 대시보드/그룹 편집 (로컬 임시 저장)
  ├─ POST /api/token → JWT 발급             ├─ JSON 복사 → GitHub에 커밋
  └─ <tableau-viz token="JWT">              └─ Vercel 재배포 → 뷰어에 반영
```

JWT는 5분마다 자동 갱신되며, Secret Key는 절대 브라우저에 노출되지 않습니다.

---

## On-Demand Access (선택)

Tableau 라이선스가 없는 직원도 열람하게 하려면:

1. Tableau Cloud → 설정 → **On-Demand Access** 활성화
2. `api/token.js` 에서 아래 주석 해제:
   ```js
   // '#odagenerated': true,
   ```

---

## 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| `⚠️ 인증 토큰을 가져오지 못했습니다` | 환경변수 누락 또는 오타 | Vercel 환경변수 재확인 후 Redeploy |
| `⚠️ 대시보드 로딩 실패` | URL 오류 또는 Connected App 비활성 | URL 및 Connected App 활성화 확인 |
| 빈 화면 | Site 이름 불일치 | `TABLEAU_SITE_NAME` 재확인 |
| CORS 오류 | `TOKEN_AUDIENCE` 불일치 | 배포 URL과 정확히 일치하도록 수정 |
| `/admin` 로그인이 항상 실패 | `ADMIN_PASSWORD`/`ADMIN_SECRET` 미등록 | Vercel 환경변수 등록 후 Redeploy |
