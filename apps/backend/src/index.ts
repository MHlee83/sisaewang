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
import { collectSurveyPrices } from './jobs/collectSurvey';

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
  .mockups{display:flex;justify-content:center;gap:16px;margin-top:52px;flex-wrap:wrap;align-items:flex-end;}
  .phone{background:#1a1a1a;border:2px solid #333;border-radius:32px;width:155px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);}
  .phone-bar{background:#111;padding:8px 14px 6px;display:flex;justify-content:space-between;align-items:center;}
  .phone-time{color:#fff;font-size:10px;font-weight:600;}
  .phone-dots{color:#666;font-size:10px;letter-spacing:2px;}
  .phone-body{background:#111;padding:10px 10px 14px;}
  .phone-title{color:#fff;font-size:11px;font-weight:700;text-align:center;margin-bottom:10px;}
  /* Phone 1 - 실시간시세 */
  .price-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #222;}
  .price-name{color:#aaa;font-size:9px;}
  .price-val{color:#fff;font-size:9px;font-weight:700;}
  .price-up{color:#ff4444;font-size:8px;}
  .price-down{color:#4CAF50;font-size:8px;}
  .mini-chart{margin-top:8px;height:28px;position:relative;}
  .mini-chart svg{width:100%;height:100%;}
  /* Phone 2 - AI추천 */
  .signal-card{border-radius:8px;padding:7px 8px;margin-bottom:6px;}
  .signal-buy{background:#1a3a1a;border:1px solid #2a5a2a;}
  .signal-sell{background:#3a1a1a;border:1px solid #5a2a2a;}
  .signal-neutral{background:#222;border:1px solid #333;}
  .signal-label{font-size:8px;font-weight:700;margin-bottom:2px;}
  .signal-buy .signal-label{color:#4CAF50;}
  .signal-sell .signal-label{color:#ff4444;}
  .signal-neutral .signal-label{color:#888;}
  .signal-title{color:#fff;font-size:9px;font-weight:700;margin-bottom:2px;}
  .signal-desc{color:#888;font-size:7.5px;}
  /* Phone 3 - 가격분석 */
  .chart-subtitle{color:#aaa;font-size:8px;text-align:center;margin-bottom:8px;}
  .bar-chart{display:flex;align-items:flex-end;gap:3px;height:36px;justify-content:center;}
  .bar{background:#2d7a3a;border-radius:2px 2px 0 0;width:12px;}
  .chart-labels{display:flex;justify-content:space-between;margin-top:4px;}
  .chart-label{color:#666;font-size:7px;}
  .time-btns{display:flex;gap:4px;justify-content:center;margin-top:8px;}
  .time-btn{background:#222;color:#888;font-size:7px;padding:3px 6px;border-radius:4px;}
  .time-btn-active{background:#2d7a3a;color:#fff;}
  .price-stats{margin-top:8px;}
  .price-stat-row{display:flex;justify-content:space-between;padding:2px 0;}
  .stat-label-txt{color:#888;font-size:8px;}
  .stat-val-up{color:#ff4444;font-size:8px;font-weight:700;}
  .stat-val-down{color:#4CAF50;font-size:8px;font-weight:700;}

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
    <a href="/health" class="btn">🟢 API 상태 확인</a>
    <a href="mailto:boongss@psynet.co.kr" class="btn btn-outline">문의하기</a>
  </div>

  <div class="mockups">
    <!-- Phone 1: 실시간 시세 -->
    <div class="phone">
      <div class="phone-bar"><span class="phone-time">9:41</span><span class="phone-dots">•••</span></div>
      <div class="phone-body">
        <div class="phone-title">실시간 시세</div>
        <div class="price-row"><span class="price-name">사과 (후지)</span><span class="price-val">42,000원</span><span class="price-up">+2.3%</span></div>
        <div class="price-row"><span class="price-name">배추</span><span class="price-val">8,500원</span><span class="price-down">-1.1%</span></div>
        <div class="price-row"><span class="price-name">돼지고기</span><span class="price-val">15,200원</span><span class="price-up">+0.8%</span></div>
        <div class="price-row"><span class="price-name">쌀 (20kg)</span><span class="price-val">58,000원</span><span class="price-up">+0.2%</span></div>
        <div class="price-row"><span class="price-name">고추</span><span class="price-val">12,400원</span><span class="price-down">-3.2%</span></div>
        <div class="mini-chart">
          <svg viewBox="0 0 130 28" preserveAspectRatio="none">
            <polyline points="0,22 20,18 40,20 60,15 80,12 100,8 130,5" fill="none" stroke="#4CAF50" stroke-width="1.5"/>
            <polygon points="0,22 20,18 40,20 60,15 80,12 100,8 130,5 130,28 0,28" fill="rgba(76,175,80,0.15)"/>
          </svg>
        </div>
      </div>
    </div>
    <!-- Phone 2: AI 출하 추천 -->
    <div class="phone" style="transform:scale(1.06);transform-origin:bottom center;">
      <div class="phone-bar"><span class="phone-time">9:41</span><span class="phone-dots">•••</span></div>
      <div class="phone-body">
        <div class="phone-title">AI 출하 추천</div>
        <div class="signal-card signal-buy">
          <div class="signal-label">매수 신호</div>
          <div class="signal-title">사과 이번주 출하 적기</div>
          <div class="signal-desc">평균 대비 +15% 예측</div>
        </div>
        <div class="signal-card signal-sell">
          <div class="signal-label">매도 신호</div>
          <div class="signal-title">배추 가격 하락 예상</div>
          <div class="signal-desc">2주 내 -8% 예측</div>
        </div>
        <div class="signal-card signal-neutral">
          <div class="signal-label">시장 동향</div>
          <div class="signal-title">시장 동향</div>
          <div class="signal-desc">이번 주 채소류 전반적 강세, 과일류는 보합세 유지 전망</div>
        </div>
      </div>
    </div>
    <!-- Phone 3: 가격 분석 -->
    <div class="phone">
      <div class="phone-bar"><span class="phone-time">9:41</span><span class="phone-dots">•••</span></div>
      <div class="phone-body">
        <div class="phone-title">가격 분석</div>
        <div class="chart-subtitle">사과 (후지) 30일 추이</div>
        <div class="bar-chart">
          <div class="bar" style="height:18px;opacity:.5"></div>
          <div class="bar" style="height:22px;opacity:.6"></div>
          <div class="bar" style="height:16px;opacity:.5"></div>
          <div class="bar" style="height:28px;opacity:.7"></div>
          <div class="bar" style="height:24px;opacity:.7"></div>
          <div class="bar" style="height:32px;opacity:.85"></div>
          <div class="bar" style="height:30px;opacity:.85"></div>
          <div class="bar" style="height:36px"></div>
        </div>
        <div class="chart-labels"><span class="chart-label">4주전</span><span class="chart-label">현재</span></div>
        <div class="time-btns">
          <div class="time-btn time-btn-active">1주</div>
          <div class="time-btn">1개월</div>
          <div class="time-btn">3개월</div>
        </div>
        <div class="price-stats">
          <div class="price-stat-row"><span class="stat-label-txt">최고가</span><span class="stat-val-up">45,000원</span></div>
          <div class="price-stat-row"><span class="stat-label-txt">최저가</span><span class="stat-val-down">38,000원</span></div>
        </div>
      </div>
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
    <small style="opacity:.6">© 2025 HappyFood. All rights reserved.</small>
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

// ===== 관리자 수동 트리거 (ADMIN_SECRET 필요) =====
router.post('/admin/collect/survey', async (req, res) => {
    const secret = req.headers['x-admin-secret'];
    if (!secret || secret !== process.env.ADMIN_SECRET) {
        res.status(401).json({ error: 'UNAUTHORIZED' });
        return;
    }
    try {
        logger.info('[Admin] 수동 KAMIS 조사가격 수집 시작');
        collectSurveyPrices().catch((e) => logger.error('수동 수집 오류:', e));
        res.json({ ok: true, message: '조사가격 수집 시작됨 (백그라운드)' });
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});

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
