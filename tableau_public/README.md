# Tableau Analytics Portal — 배포 가이드

방문자 로그인 없이 Tableau Cloud 대시보드를 임베딩하는 포털입니다.
Vercel 서버리스 함수가 JWT를 발급하므로 Secret Key가 브라우저에 노출되지 않습니다.

---

## 구조

```
tableau-vercel-project/
├── public/
│   └── index.html          # 포털 프론트엔드
├── api/
│   └── token.js            # JWT 발급 서버리스 함수 (Vercel)
├── vercel.json             # Vercel 라우팅 설정
├── .env.example            # 환경변수 예시
└── .gitignore
```

---

## Step 1 — Tableau Connected Apps 설정 (5분)

1. Tableau Cloud 관리자 계정으로 로그인
2. 상단 메뉴 **설정(Settings)** → **Connected Apps** 탭 이동
3. **새 Connected App 만들기** 클릭
   - 이름: `Analytics Portal` (자유)
   - 접근 레벨: **모든 프로젝트** 또는 원하는 프로젝트 지정
4. 생성된 앱 클릭 → **Client ID** 복사해두기
5. **Secrets** 탭 → **새 Secret 생성**
   - **Secret ID**와 **Secret Value** 를 모두 복사 (Value는 이 화면에서만 확인 가능)
6. Connected App **활성화** 토글 ON

> ⚠️ Secret Value는 생성 직후 한 번만 표시됩니다. 반드시 즉시 복사하세요.

---

## Step 2 — GitHub 저장소 생성

```bash
# 이 폴더를 GitHub에 올립니다
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

등록 후 **Redeploy** (Deployments 탭 → 최신 배포 우클릭 → Redeploy)

---

## Step 5 — 대시보드 URL 등록

1. 배포된 포털 접속
2. 상단 **설정** 탭 클릭
3. **대시보드 설정**에서 Tableau Cloud URL 입력 후 저장
   - URL 형식: `https://prod-apnortheast-a.online.tableau.com/#/site/SITE/views/WORKBOOK/DASHBOARD`
   - Tableau Cloud에서 대시보드 열기 → 공유 버튼 → **링크 복사**

---

## 동작 원리

```
방문자 브라우저
  │
  ├─ index.html 로드 (Vercel 정적 파일)
  │
  ├─ POST /api/token  →  Vercel 함수 (Secret Key 안전 보관)
  │                           │
  │                    JWT 서명 후 반환 (유효 5분)
  │
  └─ <tableau-viz token="JWT">  →  Tableau Cloud 인증 통과
                                          │
                                   대시보드 렌더링 ✅
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
