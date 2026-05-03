import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { prisma } from './utils/prisma';
import { redis, isRedisEnabled } from './utils/redis';
import { logger } from './utils/logger';
import { initFirebase } from './utils/firebase';
import { startCronJobs } from './jobs';

import priceRoutes from './routes/prices';
import itemRoutes from './routes/items';
import userRoutes from './routes/users';
import alertRoutes from './routes/alerts';
import recommendationRoutes from './routes/recommendations';
import subscriptionRoutes from './routes/subscriptions';
import communityRoutes from './routes/community';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);
const API_VERSION = process.env.API_VERSION ?? 'v1';

app.use(helmet());
app.use(cors({
    origin: (process.env.ALLOWED_ORIGINS ?? '*').split(','),
    credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { error: 'TOO_MANY_REQUESTS', message: '잠시 후 다시 시도해주세요.' },
}));

// ===== 루트 (랜딩 페이지) =====
app.get('/', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>시세왕 — 농수축산물 실시간 시세 정보</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans KR',sans-serif;background:#f8faf7;color:#1a1a1a;}
  a{text-decoration:none;color:inherit;}

  /* HERO */
  .hero{background:linear-gradient(135deg,#0A4D2E 0%,#1a7a4a 100%);color:#fff;padding:72px 24px 80px;text-align:center;}
  .hero-badge{display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:999px;padding:6px 18px;font-size:13px;margin-bottom:20px;letter-spacing:.5px;}
  .hero h1{font-size:clamp(2.4rem,6vw,4rem);font-weight:800;letter-spacing:-1px;margin-bottom:8px;}
  .hero h1 span{color:#7FD9A0;}
  .hero p{font-size:clamp(1rem,2.5vw,1.25rem);opacity:.85;max-width:540px;margin:0 auto 36px;line-height:1.7;}
  .btn{display:inline-block;background:#fff;color:#0A4D2E;font-weight:700;font-size:1rem;padding:14px 36px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);transition:transform .15s;}
  .btn:hover{transform:translateY(-2px);}
  .btn-outline{background:transparent;border:2px solid rgba(255,255,255,0.5);color:#fff;margin-left:12px;}
  .btn-outline:hover{background:rgba(255,255,255,0.1);}

  /* MOCKUPS */
  .mockups{display:flex;justify-content:center;gap:20px;margin-top:52px;flex-wrap:wrap;}
  .phone{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:28px;padding:20px 16px;width:160px;text-align:center;}
  .phone-icon{font-size:2.4rem;margin-bottom:10px;}
  .phone-label{font-size:11px;opacity:.7;line-height:1.5;}
  .phone-title{font-size:13px;font-weight:600;margin-bottom:6px;}

  /* FEATURES */
  .section{padding:64px 24px;max-width:1000px;margin:0 auto;}
  .section-title{font-size:clamp(1.5rem,4vw,2.2rem);font-weight:800;text-align:center;margin-bottom:8px;color:#0A4D2E;}
  .section-sub{text-align:center;color:#555;margin-bottom:44px;font-size:1rem;line-height:1.6;}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;}
  .card{background:#fff;border-radius:20px;padding:28px 24px;box-shadow:0 2px 16px rgba(0,77,46,0.07);border:1px solid #e8f3ec;}
  .card-icon{font-size:2rem;margin-bottom:14px;}
  .card h3{font-size:1.05rem;font-weight:700;margin-bottom:8px;color:#0A4D2E;}
  .card p{font-size:.9rem;color:#555;line-height:1.65;}

  /* DATA SOURCE */
  .data-section{background:linear-gradient(135deg,#f0faf4,#e6f4ed);padding:56px 24px;}
  .data-inner{max-width:860px;margin:0 auto;display:flex;align-items:center;gap:40px;flex-wrap:wrap;}
  .data-badge{background:#0A4D2E;color:#fff;font-size:22px;font-weight:900;padding:18px 28px;border-radius:16px;white-space:nowrap;}
  .data-text h3{font-size:1.3rem;font-weight:700;color:#0A4D2E;margin-bottom:10px;}
  .data-text p{color:#444;line-height:1.7;font-size:.95rem;}

  /* STATS */
  .stats{display:flex;justify-content:center;gap:40px;flex-wrap:wrap;padding:48px 24px;background:#fff;border-top:1px solid #e8f3ec;border-bottom:1px solid #e8f3ec;}
  .stat{text-align:center;}
  .stat-num{font-size:2rem;font-weight:800;color:#0A4D2E;}
  .stat-label{font-size:.85rem;color:#666;margin-top:4px;}

  /* FOOTER */
  footer{background:#0A4D2E;color:rgba(255,255,255,0.7);padding:36px 24px;text-align:center;font-size:.88rem;line-height:2;}
  footer strong{color:#7FD9A0;}
  footer a{color:#7FD9A0;}

  @media(max-width:600px){
    .btn-outline{margin-left:0;margin-top:12px;display:block;}
    .data-inner{flex-direction:column;}
  }
</style>
</head>
<body>

<!-- HERO -->
<section class="hero">
  <div class="hero-badge">🌾 농수축산물 스마트 시세 플랫폼</div>
  <h1>시세왕 <span>王</span></h1>
  <p>실시간 경락가격 · AI 출하 추천 · 가격 히스토리<br>농가와 바이어를 위한 가장 빠른 시세 정보</p>
  <div>
    <a href="/v1/health" class="btn">🟢 API 상태 확인</a>
    <a href="mailto:boongss@psynet.co.kr" class="btn btn-outline">문의하기</a>
  </div>

  <div class="mockups">
    <div class="phone">
      <div class="phone-icon">📊</div>
      <div class="phone-title">실시간 경락가</div>
      <div class="phone-label">KAMIS 연동<br>실시간 시세</div>
    </div>
    <div class="phone">
      <div class="phone-icon">🤖</div>
      <div class="phone-title">AI 출하 추천</div>
      <div class="phone-label">최적 출하 시점<br>자동 분석</div>
    </div>
    <div class="phone">
      <div class="phone-icon">📈</div>
      <div class="phone-title">가격 히스토리</div>
      <div class="phone-label">연간 트렌드<br>차트 분석</div>
    </div>
  </div>
</section>

<!-- STATS -->
<div class="stats">
  <div class="stat"><div class="stat-num">500+</div><div class="stat-label">조회 품목</div></div>
  <div class="stat"><div class="stat-num">실시간</div><div class="stat-label">경락가격 업데이트</div></div>
  <div class="stat"><div class="stat-num">AI</div><div class="stat-label">출하 시점 추천</div></div>
  <div class="stat"><div class="stat-num">전국</div><div class="stat-label">도매시장 커버</div></div>
</div>

<!-- FEATURES -->
<div class="section">
  <div class="section-title">주요 기능</div>
  <div class="section-sub">농가와 유통 종사자를 위한 핵심 기능을 한 앱에서</div>
  <div class="grid">
    <div class="card">
      <div class="card-icon">🥬</div>
      <h3>실시간 경락가격</h3>
      <p>KAMIS 공공 API를 통해 전국 도매시장의 경락가격을 실시간으로 조회합니다.</p>
    </div>
    <div class="card">
      <div class="card-icon">🤖</div>
      <h3>AI 출하 추천</h3>
      <p>가격 추세와 시장 데이터를 분석해 최적의 출하 시점을 AI가 자동으로 추천합니다.</p>
    </div>
    <div class="card">
      <div class="card-icon">📉</div>
      <h3>가격 히스토리</h3>
      <p>품목별 연간·월별 가격 변화를 차트로 시각화해 시장 트렌드를 한눈에 파악합니다.</p>
    </div>
    <div class="card">
      <div class="card-icon">🧮</div>
      <h3>손익 계산기</h3>
      <p>출하량과 현재 시세를 입력하면 예상 수익을 즉시 계산해 드립니다.</p>
    </div>
    <div class="card">
      <div class="card-icon">🔔</div>
      <h3>가격 알림</h3>
      <p>설정한 목표 가격 도달 시 푸시 알림을 발송해 출하 타이밍을 놓치지 않습니다.</p>
    </div>
    <div class="card">
      <div class="card-icon">💬</div>
      <h3>농가 커뮤니티</h3>
      <p>전국 농가 종사자들과 시세 정보 및 출하 노하우를 실시간으로 공유합니다.</p>
    </div>
  </div>
</div>

<!-- DATA SOURCE -->
<div class="data-section">
  <div class="data-inner">
    <div class="data-badge">KAMIS</div>
    <div class="data-text">
      <h3>농산물유통정보(KAMIS) 공공 API 활용</h3>
      <p>
        본 서비스는 <strong>농림축산식품부</strong> 산하 <strong>한국농수산식품유통공사(aT)</strong>가 운영하는
        농산물유통정보(KAMIS) 오픈 API를 활용하여 농·수·축산물의 경락가격 및 도·소매 시세 정보를 제공합니다.
        공신력 있는 공공 데이터를 기반으로 정확하고 신뢰할 수 있는 시세 정보를 서비스합니다.
      </p>
    </div>
  </div>
</div>

<!-- FOOTER -->
<footer>
  <div>
    <strong>시세왕 (SisaeWang)</strong> — 농수축산물 실시간 시세 정보 서비스<br>
    문의: <a href="mailto:heyboongss@naver.com">heyboongss@naver.com</a><br>
    <small style="opacity:.6">© 2024 PsyNet. All rights reserved. API v${process.env.API_VERSION ?? 'v1'}</small>
  </div>
</footer>

</body>
</html>`);
});

// ===== 헬스체크 =====
app.get('/health', async (_req, res) => {
    try {
          await prisma.$queryRaw`SELECT 1`;
          const redisStatus = isRedisEnabled
            ? await redis.ping().then(() => 'ok').catch(() => 'error')
                  : 'disabled';
          res.json({ status: 'ok', db: 'ok', redis: redisStatus, ts: new Date().toISOString() });
    } catch (err) {
          res.status(503).json({ status: 'error', message: (err as Error).message });
    }
});

// ===== API 라우터 =====
const router = express.Router();

router.use('/prices',          priceRoutes);
router.use('/items',           itemRoutes);
router.use('/users',           userRoutes);
router.use('/users/me/alerts', alertRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/subscriptions',   subscriptionRoutes);
router.use('/community',       communityRoutes);

app.use(`/${API_VERSION}`, router);

// ===== 에러 핸들러 =====
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: '서버 오류가 발생했습니다.' });
});

// ===== 서버 시작 =====
async function bootstrap() {
    try {
          await prisma.$connect();
          logger.info('DB connected');

      if (isRedisEnabled) {
              await redis.ping();
              logger.info('Redis connected');
      } else {
              logger.warn('Redis disabled — REDIS_URL not set');
      }

      try {
              initFirebase();
              logger.info('Firebase Admin initialized');
      } catch (firebaseErr) {
              logger.warn('Firebase init failed (push notifications disabled):', firebaseErr);
      }

      if (process.env.NODE_ENV === 'production') {
              startCronJobs();
              logger.info('Cron Jobs started');
      }

      app.listen(PORT, () => {
              logger.info(`Server running on port ${PORT} — /${API_VERSION}`);
      });
    } catch (err) {
      logger.error('Bootstrap failed:', err);
      process.exit(1);
    }
}

bootstrap();
