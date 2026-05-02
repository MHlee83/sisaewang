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

// ===== 루트 =====
app.get('/', (_req, res) => {
    res.json({
        name: '시세왕 API',
        description: '농수축산물 실시간 경락가격 및 시세 정보 서비스',
        version: process.env.API_VERSION ?? 'v1',
        docs: `/${process.env.API_VERSION ?? 'v1'}/health`,
    });
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
              logger.info(`Server running on port ${PORT} — /${API_VE