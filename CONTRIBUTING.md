# G-BUS 협업 가이드 (AI 사용자용)

## 기본 원칙

> **main 브랜치에 직접 push 불가** — 반드시 브랜치 만들고 PR로 머지

## 작업 흐름

### 1. 이슈 먼저 (코드 안 건드려도 OK)

GitHub Issues에서 버그나 기능 요청을 먼저 등록해주세요:
- **버그**: 뭘 했더니 뭐가 안 됐는지 + 스크린샷
- **기능 요청**: 어떤 기능이 왜 필요한지

이슈만 올려도 충분합니다. 코드는 개발자가 처리합니다.

---

### 2. 직접 코드 수정하고 싶다면

#### 환경 세팅 (최초 1회)
```bash
# 1) 레포 클론
git clone https://github.com/hundredcorekorea/G-Bus.git
cd G-Bus

# 2) 패키지 설치
npm install

# 3) 환경변수 파일 (.env.local) — 개발자한테 받기
```

#### 작업할 때마다
```bash
# 1) 최신 코드 받기
git pull origin main

# 2) 내 브랜치 만들기 (이름 규칙: feature/기능명 또는 fix/버그명)
git checkout -b feature/내기능이름

# 3) AI로 코드 수정 (Claude, Cursor 등)

# 4) 빌드 확인 — 이거 통과해야 PR 가능
npm run build

# 5) 커밋 & 푸시
git add .
git commit -m "feat: 변경 내용 설명"
git push origin feature/내기능이름

# 6) GitHub에서 Pull Request 생성
#    → 리뷰 후 머지됩니다
```

---

## 절대 하지 말 것

| 금지 | 이유 |
|------|------|
| `supabase/migrations/` 파일 수정 | DB 날아갈 수 있음 |
| `.env.local` 커밋 | 비밀키 유출 |
| `npm run build` 안 하고 PR | 배포 깨짐 |
| `git push --force` | 다른 사람 작업 날아감 |

## 건드려도 안전한 파일

| 파일/폴더 | 용도 |
|-----------|------|
| `src/app/*/page.tsx` | 페이지 UI |
| `src/components/` | 공통 컴포넌트 |
| `public/` | 이미지, 아이콘 |
| `src/lib/constants.ts` | 던전 이름, 포지션 등 상수 |

## 건드리면 위험한 파일

| 파일/폴더 | 이유 |
|-----------|------|
| `supabase/migrations/` | DB 스키마 변경 |
| `src/lib/supabase/` | 인증/DB 연결 |
| `middleware.ts` | 라우팅 보안 |
| `.env.local` | 비밀키 |

---

## AI로 작업할 때 팁

1. **변경 범위를 최소화** — 한 번에 한 기능만
2. **빌드 확인 필수** — `npm run build` 에러 나면 PR 올리지 마세요
3. **스크린샷 첨부** — PR에 변경 전/후 스크린샷 붙이면 리뷰가 빨라집니다
4. **모르겠으면 이슈로** — 코드 대신 이슈로 요청하는 게 더 빠를 수 있습니다
