# 시세왕 출시 체크리스트 & 장애 대응 매뉴얼

> 최종 업데이트: 2026-05-08  
> 담당: MHlee83 (boongss@psynet.co.kr)

---

## PART 1. D-7 출시 전 체크리스트

### 🔧 인프라 & 백엔드

- [ ] **Railway Production 환경변수 설정**
  - `DATABASE_URL` → Supabase production pooler URL
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `JWT_SECRET` (최소 64자 랜덤 문자열)
  - `KAMIS_API_KEY`, `AUCTION_API_KEY`
  - `ALLOWED_ORIGINS=https://api.sisaewang.kr`
  - `NODE_ENV=production`

- [ ] **Prisma 마이그레이션 실행**
  ```bash
  # Railway CLI 또는 Railway 콘솔에서
  npx prisma migrate deploy
  ```

- [ ] **도메인 연결** (`api.sisaewang.kr` → Railway)
  - Railway 대시보드 → Settings → Domains → Custom Domain 추가
  - DNS: CNAME `api` → Railway 제공 도메인

- [ ] **SSL 인증서 확인** (Railway 자동 발급, 수동 확인)

- [ ] **Health Check 엔드포인트 동작 확인**
  ```bash
  curl https://api.sisaewang.kr/health
  # 응답: { "status": "ok", "timestamp": "...", "uptime": ... }
  ```

- [ ] **Rate Limiter 동작 확인** (100req/15min 일반, 30req/hour 쓰기)

- [ ] **CORS 설정 확인** (모바일 앱의 null origin 허용 포함)

---

### 📱 모바일 앱 (EAS Build)

- [ ] **app.json 버전 확인**
  - `version`: `1.0.0`
  - `android.versionCode`: `1`
  - `ios.buildNumber`: `1`

- [ ] **Production API URL 확인** (`eas.json` production 프로파일)
  - `EXPO_PUBLIC_API_URL=https://api.sisaewang.kr/v1`

- [ ] **Android Production 빌드**
  ```bash
  eas build --platform android --profile production
  ```

- [ ] **iOS Production 빌드**
  ```bash
  eas build --platform ios --profile production
  ```

- [ ] **앱 스토어 내부 테스트 배포 (Internal Testing)**
  - Google Play: Internal Testing 트랙에 APK 업로드
  - Apple: TestFlight에 빌드 업로드

- [ ] **기능 최종 검증 (Smoke Test)**
  - [ ] 홈 화면: 시세 데이터 로딩
  - [ ] 분석 화면: 3개 탭 정상 동작
  - [ ] 커뮤니티: 글쓰기 / 댓글 / 답글
  - [ ] 즐겨찾기: 저장 / 해제
  - [ ] 알림: 가격 알림 설정

---

### 📄 법무 & 규정

- [ ] **개인정보처리방침** 앱 내 링크 연결
  - 파일: `docs/legal/privacy-policy.md`
  - 앱 내 웹뷰 또는 외부 호스팅 URL 필요

- [ ] **이용약관** 앱 내 링크 연결
  - 파일: `docs/legal/terms-of-service.md`

- [ ] **Google Play 개인정보처리방침 URL 등록**
  - Play Console → 앱 콘텐츠 → 개인정보처리방침

- [ ] **App Store 개인정보처리방침 URL 등록**
  - App Store Connect → 앱 정보 → 개인정보처리방침 URL

- [ ] **시세 정보 면책 고지** 앱 내 표시 확인 (이용약관 제5조 기반)

---

### 🔍 모니터링

- [ ] **UptimeRobot 또는 Better Uptime 설정**
  - 모니터링 URL: `https://api.sisaewang.kr/health`
  - 알림 주기: 5분
  - 장애 알림: 이메일 + (선택) Slack

- [ ] **Railway 로그 모니터링** 확인 (Railway 대시보드 → Logs)

- [ ] **Supabase Dashboard 접속 확인**
  - https://supabase.com/dashboard/project/jjhdzuxzxxsietcnolro

---

## PART 2. 장애 대응 매뉴얼 (Incident Response)

### 🚨 장애 등급 정의

| 등급 | 정의 | 목표 대응 시간 | 예시 |
|------|------|--------------|------|
| **P1 (Critical)** | 서비스 전면 불가 | 30분 이내 | API 서버 다운, DB 연결 불가 |
| **P2 (High)** | 주요 기능 장애 | 2시간 이내 | 시세 데이터 미업데이트, 로그인 불가 |
| **P3 (Medium)** | 부분 기능 이상 | 당일 내 | 커뮤니티 에러, 알림 지연 |
| **P4 (Low)** | UI 버그, 경미한 이슈 | 다음 버전 | 오타, 레이아웃 깨짐 |

---

### 🔴 P1 대응 절차 — API 서버 다운

**증상**: Health Check 실패, 앱에서 모든 API 오류

**Step 1: 상태 확인 (5분 이내)**
```bash
# API 상태 확인
curl https://api.sisaewang.kr/health

# Railway 서비스 상태 확인
# Railway 대시보드 → Deployments 탭 확인
```

**Step 2: 원인 파악 (10분 이내)**
- Railway 대시보드 → **Logs** 탭에서 에러 메시지 확인
- 최근 배포 이력 확인 (Deployments 탭)
- DB 연결 상태 확인 (Supabase 대시보드)

**Step 3: 복구**
```bash
# 옵션 A: 이전 배포로 롤백 (Railway 대시보드에서 클릭)
# Deployments → 이전 성공 배포 → Redeploy

# 옵션 B: 코드 핫픽스 후 재배포
git add -A && git commit -m "fix: hotfix for P1 incident"
git push origin main  # Railway 자동 배포 트리거
```

**Step 4: 확인**
```bash
curl https://api.sisaewang.kr/health
# 정상: {"status":"ok",...}
```

---

### 🔴 P1 대응 절차 — DB 연결 장애

**증상**: API 500 에러, 로그에 `PrismaClientKnownRequestError`

**Step 1: Supabase 상태 확인**
- https://status.supabase.com 접속 → 서비스 상태 확인
- 대시보드 → https://supabase.com/dashboard/project/jjhdzuxzxxsietcnolro → **Database** 탭

**Step 2: Connection Pool 확인**
- Supabase 대시보드 → Database → Connection Pooling
- Active connections 수 확인 (Free 티어: 최대 200)

**Step 3: 임시 조치**
```bash
# Railway 환경변수에서 DB URL을 Pooler URL로 전환
# DATABASE_URL_POOLER 사용:
# postgresql://postgres.jjhdzuxzxxsietcnolro:[PW]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**Step 4: Supabase가 전면 다운인 경우**
- 앱에서 Mock 데이터로 폴백 (이미 구현됨)
- 복구 후 정상 데이터 재동기화

---

### 🟡 P2 대응 절차 — 시세 데이터 미업데이트

**증상**: 앱에서 오래된 가격 정보 표시, Cron Job 실패

**Step 1: Cron Job 상태 확인**
```bash
# Railway 로그에서 cron 실행 확인
# "[Cron] 가격 데이터 수집 시작" 로그 없으면 문제

# 수동으로 데이터 수집 API 호출 (임시)
curl -X POST https://api.sisaewang.kr/v1/admin/cron/price-update \
  -H "X-Admin-Secret: [ADMIN_SECRET]"
```

**Step 2: 외부 API 상태 확인**
- KAMIS API: https://www.kamis.or.kr/customer/main/main.do
- 공공데이터포털: https://www.data.go.kr

**Step 3: 대안**
- KAMIS API 다운 시: 캐시된 최근 데이터 유지
- 앱 공지: "현재 일부 시세 데이터가 지연되고 있습니다"

---

### 🟡 P2 대응 절차 — 로그인/회원가입 장애

**증상**: 사용자 로그인 불가, 회원가입 실패

**확인 사항**:
- Firebase 상태: https://status.firebase.google.com
- JWT_SECRET 환경변수 설정 여부
- Railway 로그에서 `[Auth]` 관련 에러 확인

---

### 📊 모니터링 대시보드 URL

| 서비스 | URL |
|--------|-----|
| Railway (백엔드) | https://railway.app/dashboard |
| Supabase (DB) | https://supabase.com/dashboard/project/jjhdzuxzxxsietcnolro |
| API Health | https://api.sisaewang.kr/health |
| Supabase Status | https://status.supabase.com |
| Firebase Status | https://status.firebase.google.com |

---

## PART 3. 정기 운영 가이드

### 📅 일일 점검 (5분)

```
□ API Health Check 확인
□ Railway 로그에 에러 없음 확인
□ 시세 데이터 업데이트 정상 동작 확인
□ 커뮤니티 스팸/부적절 게시물 확인
```

### 📅 주간 점검 (30분)

```
□ Supabase DB 용량 확인 (Free: 500MB 한도)
□ Railway 사용량 확인 (Free: $5 크레딧)
□ 오류 로그 패턴 분석
□ 앱 스토어 리뷰 확인 및 응답
□ API 응답시간 P95 확인
```

### 📅 월간 점검

```
□ 의존 패키지 보안 업데이트 (npm audit fix)
□ Supabase 백업 확인
□ 법무 문서 내용 최신성 검토
□ API 키 교체 검토 (분기 1회)
```

---

## PART 4. 롤백 절차

### 백엔드 롤백

```
1. Railway 대시보드 접속
2. 해당 서비스 → Deployments 탭
3. 마지막으로 정상 동작한 배포 클릭
4. "Redeploy" 버튼 클릭
5. 약 2-3분 후 Health Check 확인
```

### 모바일 앱 롤백

```
Android:
1. Google Play Console → 앱 → Production
2. 릴리즈 → 이전 릴리즈로 롤아웃

iOS:
1. App Store Connect → 앱 → 버전 및 플랫폼
2. 이전 승인된 버전으로 릴리즈 변경 (Apple 심사 재필요 없음)
```

---

## PART 5. 연락처

| 역할 | 연락처 |
|------|--------|
| 개발/운영 | boongss@psynet.co.kr |
| Railway 지원 | https://railway.app/help |
| Supabase 지원 | https://supabase.com/support |
| Google Play 지원 | https://support.google.com/googleplay/android-developer |
| App Store 지원 | https://developer.apple.com/contact |
