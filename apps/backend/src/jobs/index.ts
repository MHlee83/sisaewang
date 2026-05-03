import cron from 'node-cron';
import { collectAuctionPrices } from './collectAuction';
import { collectSurveyPrices } from './collectSurvey';
import { warmCache } from './warmCache';
import { checkAlerts } from './alertWorker';
import { logger } from '../utils/logger';

export function startCronJobs() {
  // 경락가격 수집 — 평일 오전 9시 30분
  cron.schedule('30 9 * * 1-5', async () => {
    logger.info('[Cron] 경락가격 수집 시작 (09:30)');
    await collectAuctionPrices().catch((e) => logger.error('경락가 수집 오류:', e));
  }, { timezone: 'Asia/Seoul' });

  // 경락가격 수집 — 평일 오후 1시 30분 (2차)
  cron.schedule('30 13 * * 1-5', async () => {
    logger.info('[Cron] 경락가격 수집 시작 (13:30)');
    await collectAuctionPrices().catch((e) => logger.error('경락가 수집 오류:', e));
  }, { timezone: 'Asia/Seoul' });

  // 조사가격 수집 — 매일 오전 10시
  cron.schedule('0 10 * * *', async () => {
    logger.info('[Cron] 조사가격 수집 시작');
    await collectSurveyPrices().catch((e) => logger.error('조사가격 수집 오류:', e));
  }, { timezone: 'Asia/Seoul' });

  // Redis 캐시 워밍 — 매일 오전 10시 5분
  cron.schedule('5 10 * * *', async () => {
    logger.info('[Cron] 캐시 워밍 시작');
    await warmCache().catch((e) => logger.error('캐시 워밍 오류:', e));
  }, { timezone: 'Asia/Seoul' });

  // 알림 체크 — 매 30분
  cron.schedule('*/30 * * * *', async () => {
    await checkAlerts().catch((e) => logger.error('알림 체크 오류:', e));
  }, { timezone: 'Asia/Seoul' });

  logger.info('✅ 모든 Cron Job 등록 완료');
}
