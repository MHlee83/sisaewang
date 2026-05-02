# 시세왕 (SisaeWang)

> **농수축산물 실시간 가격 정보 플랫폼**  
> 공공데이터(data.go.kr) 기반 · 산지-도매-소매 3단계 통합 · 출하 AI 추천

## 프로젝트 구조

```
sisaewang/
├── apps/
│   ├── mobile/       # React Native (Expo SDK 51)
│   ├── backend/      # Node.js 20 + Express 5 + Prisma
│   └── ai/           # Python 3.11 + FastAPI (AI 추천 모듈)
├── packages/
│   └── shared/       # 공유 타입 & 상수
└── package.json      # Yarn Workspaces 루트
```

## 시작하기

### 사전 요구사항
- Node.js 20+
- Yarn
- Python 3.11+ (AI 모듈)
- PostgreSQL 15+
- Redis 7+

### 환경변수 설정
```bash
cp apps/backend/.env.example apps/backend/.env
# .env 파일을 열어 API 키 및 DB URL 설정
```

### 백엔드 실행
```bash
cd apps/backend
yarn install
yarn prisma migrate dev
yarn dev
```

### 모바일 앱 실행
```bash
cd apps/mobile
yarn install
npx expo start
```

### AI 모듈 실행
```bash
cd apps/ai
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 모바일 | React Native + Expo SDK 51, Zustand, React Query v5, Victory Native |
| 백엔드 | Node.js 20, Express 5, Prisma, PostgreSQL 15, Redis 7 |
| AI 모듈 | Python 3.11, FastAPI, Prophet, scikit-learn |
| 인증 | Firebase Auth |
| 알림 | FCM (Firebase Cloud Messaging) |
| 결제 | RevenueCat |

## 개발 로드맵

- **Phase 1 (0~3개월)**: MVP — 경락가 조회, 홈 시세판, 알림
- **Phase 2 (4~6개월)**: AI 출하 추천, 인앱 결제
- **Phase 3 (7~9개월)**: B2B 대시보드, 웹
- **Phase 4 (10~12개월)**: 플랫폼화, API 재판매
