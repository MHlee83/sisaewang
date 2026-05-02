import dayjs from 'dayjs';
import { prisma } from '../utils/prisma';
import { sendPushNotification } from '../utils/firebase';
import { logger } from '../utils/logger';

export async function checkAlerts(): Promise<void> {
  const today = dayjs().startOf('day').toDate();

  const activeAlerts = await prisma.alert.findMany({
    where: { isActive: true },
    include: {
      user: { select: { fcmToken: true } },
      item: { select: { itemCode: true, itemName: true } },
    },
  });

  if (activeAlerts.length === 0) return;

  let firedCount = 0;

  for (const alert of activeAlerts) {
    if (!alert.user.fcmToken) continue;

    try {
      // 오늘 최신 가격 조회
      const latestPrice = await prisma.auctionPrice.findFirst({
        where: {
          itemId:   alert.itemId,
          saleDate: today,
          ...(alert.marketId && { marketId: alert.marketId }),
        },
        orderBy: { avgPrice: 'desc' },
      });

      if (!latestPrice) continue;
      const currentPrice = Number(latestPrice.avgPrice);
      const threshold    = Number(alert.thresholdValue);

      let shouldFire = false;
      let message    = '';

      switch (alert.alertType) {
        case 'PRICE_ABOVE':
          if (currentPrice >= threshold) {
            shouldFire = true;
            message = `${alert.item.itemName} 가격이 ${currentPrice.toLocaleString()}원으로 설정가(${threshold.toLocaleString()}원)에 도달했습니다.`;
          }
          break;

        case 'PRICE_BELOW':
          if (currentPrice <= threshold) {
            shouldFire = true;
            message = `${alert.item.itemName} 가격이 ${currentPrice.toLocaleString()}원으로 목표가(${threshold.toLocaleString()}원) 이하입니다.`;
          }
          break;

        case 'CHANGE_RATE': {
          // 전일 가격과 비교
          const yesterday = dayjs().subtract(1, 'day').startOf('day').toDate();
          const prevPrice = await prisma.auctionPrice.findFirst({
            where: { itemId: alert.itemId, saleDate: yesterday },
            orderBy: { avgPrice: 'desc' },
          });
          if (prevPrice) {
            const changeRate = Math.abs(
              ((currentPrice - Number(prevPrice.avgPrice)) / Number(prevPrice.avgPrice)) * 100
            );
            if (changeRate >= threshold) {
              shouldFire = true;
              const dir = currentPrice > Number(prevPrice.avgPrice) ? '상승' : '하락';
              message = `${alert.item.itemName} 가격이 전일 대비 ${changeRate.toFixed(1)}% ${dir}했습니다.`;
            }
          }
          break;
        }

        case 'VS_AVERAGE':
          // TODO: 평년 데이터 비교 (5년치 수집 후 구현)
          break;
      }

      if (shouldFire) {
        // 중복 발송 방지: 오늘 이미 발송했는지 확인
        const alreadyFired =
          alert.lastFiredAt &&
          dayjs(alert.lastFiredAt).isSame(dayjs(), 'day');

        if (!alreadyFired) {
          await sendPushNotification({
            fcmToken: alert.user.fcmToken,
            title:    '🌾 시세왕 가격 알림',
            body:     message,
            data:     {
              type:     'PRICE_ALERT',
              itemCode: alert.item.itemCode,
              alertId:  alert.id.toString(),
            },
          });

          await prisma.alert.update({
            where: { id: alert.id },
            data:  { lastFiredAt: new Date() },
          });

          await prisma.alertLog.create({
            data: {
              userId:  alert.userId,
              alertId: alert.id,
              message,
            },
          });

          firedCount++;
        }
      }
    } catch (err) {
      logger.warn(`알림 처리 오류 (alertId=${alert.id}): ${(err as Error).message}`);
    }
  }

  if (firedCount > 0) {
    logger.info(`[alertWorker] 알림 발송: ${firedCount}건`);
  }
}
