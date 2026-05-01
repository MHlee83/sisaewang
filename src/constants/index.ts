// ===== API =====
export const API_BASE_URL = 'https://api.sisaewang.kr/v1';

// ===== 색상 (등락률 규칙) =====
export const COLORS = {
  // 브랜드
  primary: '#1B5E20',      // 짙은 초록 (농업 느낌)
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',
  accent: '#FF6F00',       // 주황 포인트

  // 등락 색상
  surgeStrong: '#D32F2F',   // 강한 상승 (+5% 이상)
  surgeWeak: '#F57C00',     // 약한 상승 (+1~+5%)
  neutral: '#757575',       // 보합 (-1~+1%)
  dropWeak: '#1565C0',      // 약한 하락 (-1~-5%)
  dropStrong: '#0D47A1',    // 강한 하락 (-5% 이하)

  // 배경
  background: '#F5F5F5',
  surface: '#FFFFFF',
  divider: '#E0E0E0',

  // 텍스트
  textPrimary: '#212121',
  textSecondary: '#757575',
  textDisabled: '#BDBDBD',
} as const;

// ===== 카테고리 =====
export const CATEGORIES = [
  { code: '100', name: '채소', emoji: '🥬' },
  { code: '200', name: '과일', emoji: '🍎' },
  { code: '300', name: '수산', emoji: '🐟' },
  { code: '400', name: '축산', emoji: '🥩' },
  { code: '500', name: '곡물', emoji: '🌾' },
] as const;

// ===== 주요 도매시장 =====
export const MAIN_MARKETS = [
  { code: '000000', name: '전체' },
  { code: '110001', name: '가락', region: '서울' },
  { code: '110002', name: '강서', region: '서울' },
  { code: '210001', name: '부산', region: '부산' },
  { code: '220001', name: '대구', region: '대구' },
] as const;

// ===== 차트 기간 =====
export const CHART_PERIODS = [
  { label: '7일',  days: 7 },
  { label: '30일', days: 30 },
  { label: '1년',  days: 365 },
  { label: '5년',  days: 1825 },
] as const;

// ===== 플랜 설정 =====
export const PLAN_LIMITS = {
  FREE: {
    maxItems: 3,
    maxAlerts: 1,
    chartDays: 30,
    aiRecommendation: false,
    weeklyReport: false,
    csvExport: false,
  },
  PREMIUM: {
    maxItems: Infinity,
    maxAlerts: Infinity,
    chartDays: 1825,
    aiRecommendation: true,
    weeklyReport: false,
    csvExport: true,
  },
  BUSINESS: {
    maxItems: Infinity,
    maxAlerts: Infinity,
    chartDays: 1825,
    aiRecommendation: true,
    weeklyReport: true,
    csvExport: true,
  },
  ENTERPRISE: {
    maxItems: Infinity,
    maxAlerts: Infinity,
    chartDays: 1825,
    aiRecommendation: true,
    weeklyReport: true,
    csvExport: true,
  },
} as const;

// ===== AI 추천 배지 =====
export const RECOMMENDATION_CONFIG = {
  SELL_NOW: {
    label: '지금 출하',
    color: '#D32F2F',
    bgColor: '#FFEBEE',
    description: '지금 출하가 유리합니다',
  },
  SELL_SOON: {
    label: '출하 준비',
    color: '#F57C00',
    bgColor: '#FFF3E0',
    description: '1~2주 내 출하 권고',
  },
  HOLD: {
    label: '보관 관망',
    color: '#1565C0',
    bgColor: '#E3F2FD',
    description: '보관 후 출하 검토',
  },
} as const;

// ===== 등락률 임계값 =====
export const SURGE_THRESHOLD = 10; // ±10% 이상 급등락 배너 표시
