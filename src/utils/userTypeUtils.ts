import type { UserType } from '@/types';

// 카테고리별 소매가 배수 (도매 경락가 기준)
const RETAIL_MULTIPLIER: Record<string, number> = {
  '100': 1.6,  // 채소
  '200': 1.5,  // 과일
  '300': 1.8,  // 수산
  '400': 1.4,  // 축산
  '500': 1.3,  // 곡물
};

export function getRetailPrice(avgPrice: number, category: string): number {
  return Math.round(avgPrice * (RETAIL_MULTIPLIER[category] ?? 1.5));
}

// userType에 맞는 표시 가격 반환
export function getDisplayPrice(avgPrice: number, category: string, userType: UserType | undefined): number {
  return userType === 'CONSUMER' ? getRetailPrice(avgPrice, category) : avgPrice;
}

// 가격 레이블
export function getPriceLabel(userType: UserType | undefined): string {
  if (userType === 'CONSUMER') return '소매가';
  if (userType === 'FARMER')   return '경락가';
  return '도매가';
}

// 홈 섹션 서브 타이틀
export function getPriceSubLabel(userType: UserType | undefined): string {
  if (userType === 'CONSUMER') return '소매가 기준';
  if (userType === 'FARMER')   return '도매 경락가 기준';
  return '도매가 기준';
}

// userType별 추천 문구
export function getRecommendationText(
  itemName: string,
  avgPrice: number,
  avgYearPrice: number,
  changeRate: number,
  userType: UserType | undefined,
): { text: string; type: 'good' | 'bad' | 'neutral' } {
  const vsYear = avgYearPrice ? ((avgPrice - avgYearPrice) / avgYearPrice) * 100 : 0;

  if (userType === 'FARMER') {
    if (vsYear >= 10)
      return { text: `📈 평년 대비 +${vsYear.toFixed(0)}% 강세. 지금 출하가 유리합니다.`, type: 'good' };
    if (vsYear <= -10)
      return { text: `📉 평년 대비 ${vsYear.toFixed(0)}% 약세. 보관 후 출하를 고려하세요.`, type: 'bad' };
    return { text: `📊 평년 수준 유지 중. 시장 동향을 지켜보세요.`, type: 'neutral' };
  }

  if (userType === 'CONSUMER') {
    if (vsYear <= -10)
      return { text: `🛒 평년보다 ${Math.abs(vsYear).toFixed(0)}% 저렴! 지금 구매하기 좋습니다.`, type: 'good' };
    if (vsYear >= 15)
      return { text: `⚠️ 가격이 평년 대비 높습니다. 대체 품목을 고려해보세요.`, type: 'bad' };
    return { text: `✅ 가격이 안정적입니다.`, type: 'neutral' };
  }

  // BUYER
  if (changeRate <= -5)
    return { text: `💰 전일 대비 ${Math.abs(changeRate).toFixed(1)}% 하락. 대량 구매 적기입니다.`, type: 'good' };
  if (changeRate >= 10)
    return { text: `🚨 가격 급등 중. 대체 품목 또는 선구매를 검토하세요.`, type: 'bad' };
  return { text: `✅ 가격 안정. 정상 구매 진행 가능합니다.`, type: 'neutral' };
}

// 추천 배경색
export function getRecommendationColor(type: 'good' | 'bad' | 'neutral') {
  if (type === 'good')    return { bg: '#E8F5E9', text: '#2E7D32' };
  if (type === 'bad')     return { bg: '#FFEBEE', text: '#C62828' };
  return { bg: '#F5F5F5', text: '#616161' };
}

// 기본 알림 타입
export function getDefaultAlertType(userType: UserType | undefined): string {
  if (userType === 'FARMER') return 'PRICE_ABOVE';
  if (userType === 'BUYER')  return 'CHANGE_RATE';
  return 'PRICE_BELOW';
}

// userType 한글 라벨
export function getUserTypeLabel(userType: UserType | undefined): string {
  if (userType === 'FARMER') return '🌾 출하자';
  if (userType === 'BUYER')  return '🏪 바이어';
  return '🛒 소비자';
}
